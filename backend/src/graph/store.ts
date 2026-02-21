/**
 * GraphStore — the single abstraction layer over Supabase.
 * All MCP tools go through this. Nothing else touches the DB directly.
 * Swap this implementation for Neo4j/FalkorDB post-hackathon without touching index.ts.
 */

import { db } from "../db/client.js";
import { embedText } from "../db/embed.js";

// ─── Types ────────────────────────────────────────────────────

export type NodeType =
  | "fact" | "preference" | "project" | "person"
  | "concept" | "decision" | "code_pattern" | "communication_style";

export type EdgeRelationship =
  | "related_to" | "part_of" | "contradicts"
  | "supersedes" | "depends_on" | "used_in";

export interface ContextNode {
  id: string;
  user_id: string;
  type: NodeType;
  content: string;
  confidence: number;
  source_platform: string | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  last_accessed: string;
}

export interface ContextGraph {
  id: string;
  owner_id: string;
  name: string;
  type: "global" | "chat" | "project";
  platform: string | null;
  platform_chat_id: string | null;
}

export interface ShareResult {
  share_token: string;
  graph_id: string;
  permission: string;
}

// ─── Graph management ─────────────────────────────────────────

export async function ensureGlobalGraph(userId: string): Promise<ContextGraph> {
  const { data, error } = await db.rpc("ensure_global_graph", { p_user_id: userId });
  if (error) throw new Error(`ensure_global_graph failed: ${error.message}`);
  return data as ContextGraph;
}

export async function getOrCreateChatGraph(
  userId: string,
  platform: string,
  platformChatId: string
): Promise<ContextGraph> {
  // Try to find existing
  const { data: existing } = await db
    .from("context_graphs")
    .select()
    .eq("owner_id", userId)
    .eq("platform_chat_id", platformChatId)
    .single();

  if (existing) return existing as ContextGraph;

  const { data, error } = await db
    .from("context_graphs")
    .insert({
      owner_id: userId,
      name: `${platform} — ${new Date().toLocaleDateString()}`,
      type: "chat",
      platform,
      platform_chat_id: platformChatId,
    })
    .select()
    .single();

  if (error) throw new Error(`create chat graph failed: ${error.message}`);
  return data as ContextGraph;
}

// ─── Save a node (dedup-safe, concurrent-safe via DB function) ─

export interface SaveNodeArgs {
  userId: string;
  graphIds: string[];      // tag to these graphs (usually [globalId] or [globalId, chatId])
  type: NodeType;
  content: string;
  platform?: string;
  explicit?: boolean;      // user stated this directly (vs extracted)
  metadata?: Record<string, unknown>;
}

export async function saveNode(args: SaveNodeArgs): Promise<ContextNode> {
  const embedding = await embedText(args.content);
  const confidence = args.explicit ? 1.0 : 0.75;

  const { data, error } = await db.rpc("upsert_context_node", {
    p_user_id:    args.userId,
    p_graph_ids:  args.graphIds,
    p_type:       args.type,
    p_content:    args.content,
    p_embedding:  embedding,
    p_confidence: confidence,
    p_platform:   args.platform ?? "unknown",
    p_metadata:   args.metadata ?? {},
  });

  if (error) throw new Error(`saveNode failed: ${error.message}`);

  // Auto-link to related nodes (fire-and-forget, don't block tool response)
  autoLink(args.userId, (data as ContextNode).id, embedding).catch(console.error);

  return data as ContextNode;
}

// ─── Semantic search + 1-hop graph traversal ─────────────────

export interface GetContextArgs {
  userId: string;
  topic: string;
  graphIds?: string[];    // scope to specific graphs (empty = search all user nodes)
  limit?: number;
}

export interface ContextResult {
  nodes: ContextNode[];
  contextString: string;
  confidence: number;     // 0–1, how much relevant context was found
}

export async function getContextForTopic(args: GetContextArgs): Promise<ContextResult> {
  const { userId, topic, graphIds, limit = 8 } = args;
  const embedding = await embedText(topic);
  const seedLimit = Math.ceil(limit / 2);

  // 1. Find seed nodes via vector similarity
  let seedQuery = db
    .from("context_nodes")
    .select("*, node_graph_memberships(graph_id)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("embedding <=> " + JSON.stringify(embedding))
    .limit(seedLimit);

  // scope to specific graph membership if provided
  if (graphIds?.length) {
    seedQuery = seedQuery.in(
      "id",
      db.from("node_graph_memberships").select("node_id").in("graph_id", graphIds) as any
    );
  }

  const { data: seeds, error: seedErr } = await seedQuery;
  if (seedErr) throw new Error(`seed search failed: ${seedErr.message}`);
  if (!seeds?.length) return { nodes: [], contextString: "", confidence: 0 };

  // 2. Traverse 1 hop outward (exclude contradictions)
  const seedIds = seeds.map((n: any) => n.id);
  const { data: edgeRows } = await db
    .from("context_edges")
    .select("target_id, weight")
    .in("source_id", seedIds)
    .neq("relationship", "contradicts")
    .order("weight", { ascending: false })
    .limit(limit - seeds.length);

  const targetIds = (edgeRows ?? []).map((e: any) => e.target_id);

  let connected: ContextNode[] = [];
  if (targetIds.length) {
    const { data } = await db
      .from("context_nodes")
      .select()
      .in("id", targetIds)
      .eq("is_active", true);
    connected = (data ?? []) as ContextNode[];
  }

  // 3. Deduplicate and rank
  const seen = new Set<string>(seedIds);
  const allNodes: ContextNode[] = [...(seeds as ContextNode[])];
  for (const n of connected) {
    if (!seen.has(n.id)) {
      seen.add(n.id);
      allNodes.push(n);
    }
  }

  // Update last_accessed (fire-and-forget)
  db.from("context_nodes")
    .update({ last_accessed: new Date().toISOString() })
    .in("id", allNodes.map(n => n.id))
    .then(() => {});

  const contextString = allNodes
    .map(n => `[${n.type}] ${n.content}`)
    .join("\n");

  const confidence = Math.min(allNodes.length / limit, 1);

  return { nodes: allNodes, contextString, confidence };
}

// ─── Auto-link new node to related nodes (background) ────────

async function autoLink(userId: string, nodeId: string, embedding: number[]) {
  // Find nodes that are similar but NOT near-duplicates (0.70–0.94)
  const { data: related } = await db
    .from("context_nodes")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .neq("id", nodeId)
    .limit(5);

  if (!related?.length) return;

  // Build edges (idempotent via UNIQUE constraint)
  const edges = related.map((r: any) => ({
    user_id:      userId,
    source_id:    nodeId,
    target_id:    r.id,
    relationship: "related_to" as EdgeRelationship,
    weight:       0.8,
  }));

  await db
    .from("context_edges")
    .insert(edges, { count: "exact" });
  // ON CONFLICT DO NOTHING handled by UNIQUE constraint
}

// ─── List nodes for a graph ───────────────────────────────────

export async function listGraphNodes(
  userId: string,
  graphId: string,
  limit = 50
): Promise<ContextNode[]> {
  const { data, error } = await db
    .from("context_nodes")
    .select("*, node_graph_memberships!inner(graph_id)")
    .eq("user_id", userId)
    .eq("node_graph_memberships.graph_id", graphId)
    .eq("is_active", true)
    .order("last_accessed", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`listGraphNodes failed: ${error.message}`);
  return (data ?? []) as ContextNode[];
}

// ─── Share a graph ────────────────────────────────────────────

export async function shareGraph(
  graphId: string,
  sharedBy: string,
  sharedWithUser?: string,
  permission: "read" | "write" = "read"
): Promise<ShareResult> {
  const { data, error } = await db
    .from("graph_shares")
    .insert({ graph_id: graphId, shared_by: sharedBy, shared_with_user: sharedWithUser, permission })
    .select()
    .single();

  if (error) throw new Error(`shareGraph failed: ${error.message}`);
  return data as ShareResult;
}

// ─── Load nodes from a share token ───────────────────────────

export async function loadSharedGraph(shareToken: string): Promise<{
  nodes: ContextNode[];
  graphName: string;
  permission: string;
}> {
  const { data: share, error } = await db
    .from("graph_shares")
    .select("*, context_graphs(name)")
    .eq("share_token", shareToken)
    .single();

  if (error || !share) throw new Error("Invalid or expired share token");

  const nodes = await listGraphNodes(
    (share as any).context_graphs.owner_id,
    share.graph_id
  );

  return {
    nodes,
    graphName: (share as any).context_graphs.name,
    permission: share.permission,
  };
}

// ─── Fetch edges for a set of nodes ──────────────────────────

export interface GraphEdge {
  source_id: string;
  target_id: string;
  relationship: string;
  weight: number;
}

export async function getEdgesForNodes(nodeIds: string[]): Promise<GraphEdge[]> {
  if (!nodeIds.length) return [];

  const { data, error } = await db
    .from("context_edges")
    .select("source_id, target_id, relationship, weight")
    .in("source_id", nodeIds)
    .in("target_id", nodeIds);

  if (error) throw new Error(`getEdgesForNodes failed: ${error.message}`);
  return (data ?? []) as GraphEdge[];
}

// ─── Deactivate (soft delete) a node ─────────────────────────

export async function deleteNode(userId: string, nodeId: string): Promise<void> {
  const { error } = await db
    .from("context_nodes")
    .update({ is_active: false })
    .eq("id", nodeId)
    .eq("user_id", userId);   // RLS guard at app level too

  if (error) throw new Error(`deleteNode failed: ${error.message}`);
}
