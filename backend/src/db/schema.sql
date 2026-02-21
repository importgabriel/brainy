-- ============================================================
-- SwitchMemory — Context Graph Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Logical context graphs (chat, project, global) ──────────
-- These are named views/groupings over a universal node pool.
-- Nodes are NOT owned by a graph — they belong to the user.
-- A node can appear in multiple graphs via node_graph_memberships.
CREATE TABLE IF NOT EXISTS context_graphs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL,
  name             TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('global', 'chat', 'project')),
  platform         TEXT,                    -- 'chatgpt' | 'claude' | 'vscode'
  platform_chat_id TEXT,                    -- external chat/session ID
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (owner_id, platform_chat_id)       -- one graph per external chat session
);

-- ─── Universal node pool (all memories live here) ────────────
-- Nodes belong to a USER, not a specific graph.
-- Graph membership is tracked separately.
CREATE TABLE IF NOT EXISTS context_nodes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  type            TEXT NOT NULL CHECK (type IN (
                    'fact', 'preference', 'project', 'person',
                    'concept', 'decision', 'code_pattern', 'communication_style'
                  )),
  content         TEXT NOT NULL,
  embedding       vector(1536),              -- OpenAI text-embedding-3-small dimension
  confidence      FLOAT DEFAULT 1.0 CHECK (confidence BETWEEN 0 AND 1),
  source_platform TEXT,
  metadata        JSONB DEFAULT '{}',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  last_accessed   TIMESTAMPTZ DEFAULT NOW()
);

-- Fast vector search (HNSW — best for recall + speed tradeoff)
CREATE INDEX IF NOT EXISTS context_nodes_embedding_idx
  ON context_nodes USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS context_nodes_user_active_idx
  ON context_nodes (user_id, is_active);

-- ─── Node ↔ Graph membership (many-to-many) ─────────────────
-- A node can belong to: global graph, a project graph, multiple chat graphs.
-- This is what makes the subgraph model work.
CREATE TABLE IF NOT EXISTS node_graph_memberships (
  node_id    UUID NOT NULL REFERENCES context_nodes(id) ON DELETE CASCADE,
  graph_id   UUID NOT NULL REFERENCES context_graphs(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (node_id, graph_id)
);

CREATE INDEX IF NOT EXISTS memberships_graph_idx ON node_graph_memberships (graph_id);

-- ─── Edges (relationships between nodes) ─────────────────────
CREATE TABLE IF NOT EXISTS context_edges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,               -- for RLS
  source_id    UUID NOT NULL REFERENCES context_nodes(id) ON DELETE CASCADE,
  target_id    UUID NOT NULL REFERENCES context_nodes(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL CHECK (relationship IN (
                  'related_to', 'part_of', 'contradicts',
                  'supersedes', 'depends_on', 'used_in'
                )),
  weight       FLOAT DEFAULT 1.0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (source_id, target_id, relationship)  -- idempotent: ON CONFLICT DO NOTHING
);

CREATE INDEX IF NOT EXISTS context_edges_source_idx ON context_edges (source_id);
CREATE INDEX IF NOT EXISTS context_edges_user_idx ON context_edges (user_id);

-- ─── Graph sharing ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS graph_shares (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id         UUID NOT NULL REFERENCES context_graphs(id) ON DELETE CASCADE,
  shared_by        UUID NOT NULL,
  shared_with_user UUID,                    -- NULL = link-based (token only)
  permission       TEXT DEFAULT 'read' CHECK (permission IN ('read', 'write')),
  share_token      TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at       TIMESTAMPTZ,             -- NULL = never expires
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security ───────────────────────────────────────
ALTER TABLE context_graphs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_nodes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_graph_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_edges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_shares         ENABLE ROW LEVEL SECURITY;

-- Users own their graphs
CREATE POLICY "users_own_graphs" ON context_graphs
  USING (owner_id = auth.uid());

-- Users own their nodes
CREATE POLICY "users_own_nodes" ON context_nodes
  USING (user_id = auth.uid());

-- Users can see memberships for their nodes
CREATE POLICY "users_own_memberships" ON node_graph_memberships
  USING (EXISTS (
    SELECT 1 FROM context_nodes WHERE id = node_id AND user_id = auth.uid()
  ));

-- Users own their edges
CREATE POLICY "users_own_edges" ON context_edges
  USING (user_id = auth.uid());

-- Users can see shares they created or that point to them
CREATE POLICY "users_see_own_shares" ON graph_shares
  USING (shared_by = auth.uid() OR shared_with_user = auth.uid());

-- ─── Atomic upsert: dedup-safe concurrent write ───────────────
-- Checks for near-duplicate before inserting. Single transaction = safe under concurrency.
CREATE OR REPLACE FUNCTION upsert_context_node(
  p_user_id     UUID,
  p_graph_ids   UUID[],        -- tag to all these graphs on insert
  p_type        TEXT,
  p_content     TEXT,
  p_embedding   vector(1536),
  p_confidence  FLOAT,
  p_platform    TEXT,
  p_metadata    JSONB,
  p_threshold   FLOAT DEFAULT 0.95
)
RETURNS context_nodes
LANGUAGE plpgsql
AS $$
DECLARE
  existing_node context_nodes;
  result_node   context_nodes;
  gid           UUID;
BEGIN
  -- Check for near-duplicate in this user's node pool
  SELECT n.* INTO existing_node
  FROM context_nodes n
  WHERE n.user_id = p_user_id
    AND n.is_active = TRUE
    AND 1 - (n.embedding <=> p_embedding) > p_threshold
  ORDER BY n.embedding <=> p_embedding
  LIMIT 1;

  IF FOUND THEN
    -- Duplicate: bump confidence and recency
    UPDATE context_nodes
    SET
      confidence    = LEAST(existing_node.confidence + 0.05, 1.0),
      last_accessed = NOW()
    WHERE id = existing_node.id
    RETURNING * INTO result_node;
  ELSE
    -- New node: insert into universal pool
    INSERT INTO context_nodes (user_id, type, content, embedding, confidence, source_platform, metadata)
    VALUES (p_user_id, p_type, p_content, p_embedding, p_confidence, p_platform, p_metadata)
    RETURNING * INTO result_node;
  END IF;

  -- Tag node to all requested graphs (idempotent)
  FOREACH gid IN ARRAY p_graph_ids LOOP
    INSERT INTO node_graph_memberships (node_id, graph_id)
    VALUES (result_node.id, gid)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN result_node;
END;
$$;

-- ─── Get or create user's global graph ───────────────────────
CREATE OR REPLACE FUNCTION ensure_global_graph(p_user_id UUID)
RETURNS context_graphs
LANGUAGE plpgsql
AS $$
DECLARE
  g context_graphs;
BEGIN
  INSERT INTO context_graphs (owner_id, name, type)
  VALUES (p_user_id, 'Global', 'global')
  ON CONFLICT DO NOTHING;

  SELECT * INTO g
  FROM context_graphs
  WHERE owner_id = p_user_id AND type = 'global'
  LIMIT 1;

  RETURN g;
END;
$$;
