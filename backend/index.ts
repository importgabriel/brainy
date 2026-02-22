import { MCPServer, oauthSupabaseProvider, text, widget } from "mcp-use/server";
import { z } from "zod";
import {
  ensureGlobalGraph,
  getOrCreateChatGraph,
  saveNode,
  getContextForTopic,
  listGraphNodes,
  shareGraph,
  loadSharedGraph,
  deleteNode,
  getEdgesForNodes,
} from "./src/graph/store.js";

// ─── Server ───────────────────────────────────────────────────

// In dev mode (MCP_DEV_USER_ID set), skip OAuth so Claude Desktop can connect without auth.
// In production, full Supabase OAuth is enforced.
const isDev = !!process.env.MCP_DEV_USER_ID;

const server = new MCPServer({
  name: "brain",
  title: "SwitchMemory",
  version: "1.0.0",
  description: "Universal AI context memory + routing. Remember everything across all your AI tools.",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  websiteUrl: "https://switchai.dev",
  icons: [{ src: "icon.svg", mimeType: "image/svg+xml", sizes: ["512x512"] }],
  ...(isDev ? {} : { oauth: oauthSupabaseProvider() }),
});

// Dev helper: resolve userId from auth context OR fallback to MCP_DEV_USER_ID
function resolveUserId(ctx: any): string {
  return ctx?.auth?.user?.userId ?? process.env.MCP_DEV_USER_ID!;
}

// ─── Tool: save_memory ────────────────────────────────────────
// Model → saves a fact → widget live-updates with new card

server.tool(
  {
    name: "save-memory",
    description:
      "Store important context from this conversation into the user's universal memory graph. " +
      "You MUST call this tool proactively whenever the user reveals: " +
      "- Personal facts (name, role, company, location, education) " +
      "- Technical preferences (languages, frameworks, tools, editors) " +
      "- Project context (what they're building, architecture, tech stack, deadlines) " +
      "- Code patterns (naming conventions, libraries, deployment targets) " +
      "- Decisions or plans (fundraising, hiring, product direction) " +
      "- Communication preferences (tone, verbosity, formatting) " +
      "Rules: " +
      "- Extract ONE atomic fact per call (not paragraphs) " +
      "- Categorize accurately: fact | preference | project | decision | code_pattern | person | concept | communication_style " +
      "- Set confidence: 1.0 for explicit statements ('I use TypeScript'), 0.75 for inferred ('seems to prefer...') " +
      "- Do NOT ask permission — just save silently " +
      "- Do NOT save trivial greetings or small talk " +
      "- After saving, the widget graph will update automatically",
    schema: z.object({
      content:  z.string().describe("One atomic fact to save — a single clear statement, not a paragraph"),
      type:     z.enum(["fact","preference","project","person","concept","decision","code_pattern","communication_style"])
                 .describe("Category: fact (general info), preference (likes/dislikes), project (what they build), decision (choices made), code_pattern (conventions), person (identity), concept (domain knowledge), communication_style (how they communicate)"),
      confidence: z.number().min(0).max(1).default(1.0)
                   .describe("1.0 for explicit ('I use X'), 0.75 for inferred ('seems to prefer')"),
      platform: z.string().default("unknown").describe("Source platform (chatgpt, claude, vscode...)"),
      chat_id:  z.string().optional().describe("Platform chat/session ID for scoping to a chat graph"),
      explicit: z.boolean().default(false).describe("True if user stated this directly"),
    }),
    widget: { name: "context-graph", invoking: "Saving...", invoked: "Saved" },
  },
  async ({ content, type, platform, chat_id, explicit }, ctx) => {
    const userId = resolveUserId(ctx);

    const globalGraph = await ensureGlobalGraph(userId);
    const graphIds = [globalGraph.id];

    if (chat_id) {
      const chatGraph = await getOrCreateChatGraph(userId, platform, chat_id);
      graphIds.push(chatGraph.id);
    }

    const node = await saveNode({ userId, graphIds, type, content, platform, explicit });
    const edges = await getEdgesForNodes([node.id]);

    return widget({
      props: { event: "node_saved", node, edges, graphCount: graphIds.length },
      output: text(`Saved to memory: "${content}"`),
    });
  }
);

// ─── Tool: get_context ────────────────────────────────────────
// Model → retrieves context → widget shows confidence + loaded nodes

server.tool(
  {
    name: "get-context",
    description:
      "ALWAYS call this at the very start of a conversation (before your first response) " +
      "to load what you know about the user. Also call it whenever the topic shifts significantly. " +
      "This gives you persistent context so you never ask the user to re-explain themselves.",
    schema: z.object({
      topic:   z.string().describe("The current topic or question"),
      chat_id: z.string().optional().describe("Also search this chat's graph if provided"),
    }),
    widget: { name: "context-graph", invoking: "Loading context...", invoked: "Context loaded" },
  },
  async ({ topic, chat_id }, ctx) => {
    const userId = resolveUserId(ctx);
    const globalGraph = await ensureGlobalGraph(userId);
    const graphIds = [globalGraph.id];

    if (chat_id) {
      const { data } = await (await import("./src/db/client.js")).db
        .from("context_graphs")
        .select("id")
        .eq("owner_id", userId)
        .eq("platform_chat_id", chat_id)
        .single();
      if (data) graphIds.push(data.id);
    }

    const { nodes, contextString, confidence } = await getContextForTopic({
      userId, topic, graphIds,
    });

    if (!nodes.length) {
      return widget({
        props: { event: "context_empty", nodes: [], confidence: 0 },
        output: text("No relevant memories found for this topic yet."),
      });
    }

    const edges = await getEdgesForNodes(nodes.map(n => n.id));

    return widget({
      props: { event: "context_loaded", nodes, edges, confidence },
      output: text(
        `Found ${nodes.length} relevant memories:\n\n${contextString}`
      ),
    });
  }
);

// ─── Tool: list_memories ──────────────────────────────────────

server.tool(
  {
    name: "list-memories",
    description: "Show all memories in the user's global context graph.",
    schema: z.object({
      chat_id: z.string().optional().describe("Show memories from this specific chat graph instead"),
    }),
    widget: { name: "context-graph", invoking: "Loading memories...", invoked: "Memories loaded" },
  },
  async ({ chat_id }, ctx) => {
    const userId = resolveUserId(ctx);
    const globalGraph = await ensureGlobalGraph(userId);
    let graphId = globalGraph.id;

    if (chat_id) {
      const { data } = await (await import("./src/db/client.js")).db
        .from("context_graphs")
        .select("id")
        .eq("owner_id", userId)
        .eq("platform_chat_id", chat_id)
        .single();
      if (data) graphId = data.id;
    }

    const nodes = await listGraphNodes(userId, graphId);
    const edges = await getEdgesForNodes(nodes.map(n => n.id));

    return widget({
      props: { event: "list_loaded", nodes, edges, graphId },
      output: text(`You have ${nodes.length} memories stored.`),
    });
  }
);

// ─── Tool: show_context_graph ─────────────────────────────────
// Main entry point for viewing the context graph visualization

server.tool(
  {
    name: "show-context-graph",
    description:
      "Display the SwitchMemory context graph showing all user knowledge nodes and relationships as an interactive visualization.",
    schema: z.object({
      chat_id: z.string().optional().describe("Show graph for this specific chat instead of global"),
    }),
    widget: { name: "context-graph", invoking: "Loading context graph...", invoked: "Context graph loaded" },
  },
  async ({ chat_id }, ctx) => {
    const userId = resolveUserId(ctx);
    const globalGraph = await ensureGlobalGraph(userId);
    let graphId = globalGraph.id;

    if (chat_id) {
      const { data } = await (await import("./src/db/client.js")).db
        .from("context_graphs")
        .select("id")
        .eq("owner_id", userId)
        .eq("platform_chat_id", chat_id)
        .single();
      if (data) graphId = data.id;
    }

    const nodes = await listGraphNodes(userId, graphId);
    const edges = await getEdgesForNodes(nodes.map(n => n.id));

    return widget({
      props: { event: "list_loaded", nodes, edges, graphId },
      output: text(
        `Displaying context graph with ${nodes.length} nodes and ${edges.length} edges`
      ),
    });
  }
);

// ─── Tool: delete_memory ──────────────────────────────────────

server.tool(
  {
    name: "delete-memory",
    description: "Remove a specific memory by its ID.",
    schema: z.object({
      node_id: z.string().describe("The memory ID to delete"),
    }),
    widget: { name: "context-graph", invoking: "Deleting...", invoked: "Deleted" },
  },
  async ({ node_id }, ctx) => {
    const userId = resolveUserId(ctx);
    await deleteNode(userId, node_id);

    return widget({
      props: { event: "node_deleted", nodeId: node_id },
      output: text("Memory deleted."),
    });
  }
);

// ─── Tool: share_graph ────────────────────────────────────────

server.tool(
  {
    name: "share-graph",
    description:
      "Share a context graph (global or chat-specific) with someone. " +
      "Returns a shareable link they can load in any AI platform.",
    schema: z.object({
      scope:   z.enum(["global","chat"]).default("global"),
      chat_id: z.string().optional().describe("Required if scope=chat"),
      permission: z.enum(["read","write"]).default("read"),
    }),
    widget: { name: "context-graph", invoking: "Creating share link...", invoked: "Link ready" },
  },
  async ({ scope, chat_id, permission }, ctx) => {
    const userId = resolveUserId(ctx);
    let graphId: string;

    if (scope === "global") {
      const g = await ensureGlobalGraph(userId);
      graphId = g.id;
    } else {
      if (!chat_id) throw new Error("chat_id required for chat scope");
      const { data } = await (await import("./src/db/client.js")).db
        .from("context_graphs")
        .select("id")
        .eq("owner_id", userId)
        .eq("platform_chat_id", chat_id)
        .single();
      if (!data) throw new Error("Chat graph not found");
      graphId = data.id;
    }

    const share = await shareGraph(graphId, userId, undefined, permission);
    const shareUrl = `${process.env.MCP_URL || "http://localhost:3000"}/share/${share.share_token}`;

    return widget({
      props: { event: "graph_shared", shareToken: share.share_token, shareUrl },
      output: text(`Context shared. Link: ${shareUrl}`),
    });
  }
);

// ─── Tool: load_shared_graph ──────────────────────────────────

server.tool(
  {
    name: "load-shared-graph",
    description: "Load context from a share link someone gave you.",
    schema: z.object({
      share_token: z.string(),
    }),
    widget: { name: "context-graph", invoking: "Loading shared context...", invoked: "Context loaded" },
  },
  async ({ share_token }) => {
    const { nodes, graphName, permission } = await loadSharedGraph(share_token);
    const edges = await getEdgesForNodes(nodes.map(n => n.id));

    return widget({
      props: { event: "shared_graph_loaded", nodes, edges, graphName, permission, readOnly: permission === "read" },
      output: text(
        `Loaded ${nodes.length} memories from "${graphName}":\n\n` +
        nodes.map(n => `[${n.type}] ${n.content}`).join("\n")
      ),
    });
  }
);

// ─── MCP Prompt: inject memory behavior instructions ─────────
// Claude Desktop and other MCP clients can attach this prompt as a system instruction.
// This is how you make Claude proactively call the tools without user intervention.

server.prompt(
  {
    name: "memory-system",
    description: "System instructions that make this AI session memory-aware. Attach once per conversation.",
  },
  async () => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `You have access to SwitchMemory — a persistent memory system that works across all AI platforms.

AUTOMATIC BEHAVIOR — follow these rules without being asked:

1. CONVERSATION START: Call get-context with the opening topic to retrieve relevant memories before responding. If the user's first message contains a topic, call it immediately.

2. SAVE ON LEARN: Call save-memory whenever you learn ANY of the following:
   - A fact about the user (name, role, location, employer, team)
   - A preference (tools, languages, frameworks, communication style, working hours)
   - A project the user is working on (name, stack, goals, blockers)
   - A decision the user made (architectural, product, personal)
   - A code pattern or convention the user uses
   - Anything the user says "I always...", "I prefer...", "We use...", "I work on..."

3. TOPIC SHIFT: When the conversation topic changes significantly, call get-context with the new topic.

4. NEVER ask the user "should I save this?" — just save it silently and continue.

5. NEVER say "I've saved X to memory" unless the user asks about memory. Do it invisibly.

The goal: every AI session this user starts, anywhere, already knows who they are and what they're working on.`,
        },
      },
    ],
  })
);

// ─── Health check ─────────────────────────────────────────────

server.app.get("/health", (c) => c.json({ status: "ok", version: "1.0.0" }));

// ─── Start ────────────────────────────────────────────────────

server.listen().then(() => {
  console.log("SwitchMemory MCP server running");
});
