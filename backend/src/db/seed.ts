/**
 * Seed script — populates Supabase with realistic demo data.
 *
 * Run:  npx tsx backend/src/db/seed.ts
 *       npm run seed  (from repo root)
 *
 * Requires SUPABASE_URL, SUPABASE_SECRET_KEY, and OPENAI_API_KEY in .env.
 */

import { db } from "./client.js";
import { embedText } from "./embed.js";

// ─── Constants ────────────────────────────────────────────────

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_GRAPH_ID = "00000000-0000-0000-0000-000000000010";

const SEED_NODES = [
  { id: "00000000-0000-0000-0000-000000000101", content: "Uses Next.js 14 as primary framework", type: "project", source_platform: "chatgpt", confidence: 0.95 },
  { id: "00000000-0000-0000-0000-000000000102", content: "Prefers TypeScript over JavaScript", type: "preference", source_platform: "chatgpt", confidence: 0.9 },
  { id: "00000000-0000-0000-0000-000000000103", content: "Database is Supabase with PostgreSQL", type: "project", source_platform: "claude", confidence: 0.85 },
  { id: "00000000-0000-0000-0000-000000000104", content: "Using pgvector for semantic search", type: "code_pattern", source_platform: "chatgpt", confidence: 0.7 },
  { id: "00000000-0000-0000-0000-000000000105", content: "CEO and co-founder of Switch", type: "fact", source_platform: "claude", confidence: 0.8 },
  { id: "00000000-0000-0000-0000-000000000106", content: "Planning pre-seed raise", type: "decision", source_platform: "perplexity", confidence: 0.75 },
  { id: "00000000-0000-0000-0000-000000000107", content: "University of Georgia background", type: "fact", source_platform: "gemini", confidence: 0.6 },
  { id: "00000000-0000-0000-0000-000000000108", content: "Building Kayak for AI — model comparison platform", type: "project", source_platform: "chatgpt", confidence: 0.85 },
  { id: "00000000-0000-0000-0000-000000000109", content: "Prefers dark theme UIs", type: "preference", source_platform: "claude", confidence: 0.65 },
  { id: "00000000-0000-0000-0000-000000000110", content: "Prefers concise AI responses", type: "preference", source_platform: "chatgpt", confidence: 0.6 },
  { id: "00000000-0000-0000-0000-000000000111", content: "GPT-4.1 Mini as routing classifier", type: "code_pattern", source_platform: "chatgpt", confidence: 0.8 },
  { id: "00000000-0000-0000-0000-000000000112", content: "$14.99 starter tier pricing", type: "decision", source_platform: "perplexity", confidence: 0.7 },
];

// Short aliases matching the node IDs above (last 3 hex digits → label)
const NODE_ALIAS: Record<string, string> = {
  "101": "nextjs",
  "102": "typescript",
  "103": "supabase",
  "104": "pgvector",
  "105": "ceo",
  "106": "preseed",
  "107": "uga",
  "108": "kayak",
  "109": "darktheme",
  "110": "concise",
  "111": "gpt4mini",
  "112": "starter",
};

// 15 edges from App.tsx — mapped to full UUIDs
const SEED_EDGES: Array<[string, string]> = [
  ["101", "102"], // nextjs → typescript
  ["101", "103"], // nextjs → supabase
  ["103", "104"], // supabase → pgvector
  ["101", "111"], // nextjs → gpt4mini
  ["102", "111"], // typescript → gpt4mini
  ["105", "106"], // ceo → preseed
  ["105", "108"], // ceo → kayak
  ["106", "112"], // preseed → starter
  ["108", "111"], // kayak → gpt4mini
  ["108", "107"], // kayak → uga
  ["109", "110"], // darktheme → concise
  ["103", "109"], // supabase → darktheme
  ["112", "107"], // starter → uga
  ["104", "111"], // pgvector → gpt4mini
  ["106", "107"], // preseed → uga
];

function fullId(suffix: string): string {
  return `00000000-0000-0000-0000-000000000${suffix}`;
}

// ─── Main ─────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Starting seed...\n");

  // 1. Create global graph for demo user
  console.log("1/5  Creating global graph...");
  const { error: graphErr } = await db
    .from("context_graphs")
    .upsert(
      {
        id: DEMO_GRAPH_ID,
        owner_id: DEMO_USER_ID,
        name: "Global",
        type: "global",
      },
      { onConflict: "id" }
    );
  if (graphErr) throw new Error(`Graph insert failed: ${graphErr.message}`);
  console.log("     ✓ Global graph ready\n");

  // 2. Insert nodes with embeddings
  console.log("2/5  Inserting nodes (generating embeddings)...");
  for (const node of SEED_NODES) {
    const alias = NODE_ALIAS[node.id.slice(-3)];
    process.stdout.write(`     [${alias}] ${node.content}...`);

    let embedding: number[];
    try {
      embedding = await embedText(node.content);
    } catch (e: any) {
      console.log(` ⚠ embedding failed (${e.message}), using zeros`);
      embedding = new Array(1536).fill(0);
    }

    const { error } = await db.from("context_nodes").upsert(
      {
        id: node.id,
        user_id: DEMO_USER_ID,
        type: node.type,
        content: node.content,
        embedding: JSON.stringify(embedding),
        confidence: node.confidence,
        source_platform: node.source_platform,
        metadata: {},
        is_active: true,
      },
      { onConflict: "id" }
    );
    if (error) {
      console.log(` ✗ ${error.message}`);
    } else {
      console.log(" ✓");
    }
  }
  console.log();

  // 3. Node-graph memberships
  console.log("3/5  Linking nodes to global graph...");
  const memberships = SEED_NODES.map((n) => ({
    node_id: n.id,
    graph_id: DEMO_GRAPH_ID,
  }));
  const { error: memErr } = await db
    .from("node_graph_memberships")
    .upsert(memberships, { onConflict: "node_id,graph_id" });
  if (memErr) {
    console.log(`     ⚠ Membership insert: ${memErr.message}`);
  } else {
    console.log(`     ✓ ${memberships.length} memberships\n`);
  }

  // 4. Insert edges
  console.log("4/5  Inserting edges...");
  const edges = SEED_EDGES.map(([src, tgt]) => ({
    user_id: DEMO_USER_ID,
    source_id: fullId(src),
    target_id: fullId(tgt),
    relationship: "related_to",
    weight: 0.8,
  }));
  const { error: edgeErr } = await db
    .from("context_edges")
    .upsert(edges, { onConflict: "source_id,target_id,relationship" });
  if (edgeErr) {
    console.log(`     ⚠ Edge insert: ${edgeErr.message}`);
  } else {
    console.log(`     ✓ ${edges.length} edges\n`);
  }

  // 5. Summary
  console.log("5/5  Verifying...");
  const { count: nodeCount } = await db
    .from("context_nodes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", DEMO_USER_ID);
  const { count: edgeCount } = await db
    .from("context_edges")
    .select("*", { count: "exact", head: true })
    .eq("user_id", DEMO_USER_ID);
  console.log(`     ${nodeCount} nodes, ${edgeCount} edges for demo user\n`);

  console.log(`✅ Seed complete!`);
  console.log(`   Demo user ID: ${DEMO_USER_ID}`);
  console.log(`   Global graph: ${DEMO_GRAPH_ID}`);
  console.log(`   Set MCP_DEV_USER_ID=${DEMO_USER_ID} to use in dev mode`);
}

seed().catch((err) => {
  console.error("\n❌ Seed failed:", err);
  process.exit(1);
});
