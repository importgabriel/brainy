# Cortex

**A universal AI Context Graph that remembers everything about you — across ChatGPT, Claude, Gemini, and Cursor — visualized as a live context graph.**

Stop explaining yourself twice and copy-pasting context across all your apps and tools. Cortex captures what you and your favorite AI Agent do, and what you're building, then surfaces the right context wherever it's connected.

---

## How It Works

Cortex is an MCP App built on the [mcp-use](https://mcp-use.com) SDK. It runs as a server that any MCP-compatible AI client can connect to.

When you chat with an AI:
- **The model silently saves** preferences, project details, decisions, chat discussions and facts as nodes in your personal context graph
- **The model loads** relevant context at the start of every conversation so we  
- **A live widget** renders inside the chat — showing your knowledge graph in real time, updating as new nodes are saved

Everything is stored in Supabase with pgvector for semantic search. Graphs are persistent, portable, and shareable.

---

## MCP Tools

| Tool | What It Does |
|------|-------------|
| `get-context` | Semantic search over your memories. Called automatically at conversation start. |
| `save-memory` | Saves a fact, preference, decision, or project detail. Called silently as you chat. |
| `list-memories` | Returns all nodes in your global or chat-specific graph. |
| `show-context-graph` | Triggers the graph widget to render. |
| `delete-memory` | Removes a node by ID. |
| `share-graph` | Generates a shareable link to your global or chat graph. |
| `load-shared-graph` | Loads context from a link someone shared with you. |

---

## Install in ChatGPT

1. Open ChatGPT → **Settings → Connected apps → Add custom app**
2. Paste the MCP URL:
   ```
   https://young-art-084wy.run.mcp-use.com/mcp
   ```

   No auth needed!
3. Authorize and start chatting. The context graph widget will appear automatically.

## Install in Claude

1. Open Claude → **Settings → Integrations → Add integration**
2. Paste the MCP URL:
   ```
   https://young-art-084wy.run.mcp-use.com/mcp
   ```

   No auth needed!
3. That's it. Claude will now load and save your memories on every conversation.

## Install in Cursor

1. Open Cursor → **Settings → MCP → Add server**
2. Add the following to your `mcp.json`:
   ```json
   {
     "mcpServers": {
       "Cortex": {
         "url": "YOUR_MCP_URL_HERE"
       }
     }
   }
   ```

---

## Running Locally

```bash
npm install
npm run dev
```

Server starts at `http://localhost:3000`. Open the inspector at `http://localhost:3000/inspector` to test tools.

Required environment variables (create a `.env` file):

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
MCP_URL=http://localhost:3000
MCP_DEV_USER_ID=your-user-id-for-local-testing
```

## Deploying

```bash
npm run deploy
```

Deploys to Manufact MCP Cloud. The returned URL is what you paste into ChatGPT/Claude/Cursor above.

---

## Stack

- **MCP Framework** — mcp-use SDK by Manufact
- **Widget** — React + TypeScript, rendered inside the AI client
- **Database** — Supabase (PostgreSQL + pgvector)
- **Embeddings** — OpenAI `text-embedding-3-small`
- **Deployment** — Manufact MCP Cloud

---

Built for the [mcp-use MCP Apps Hackathon at Y Combinator](https://mcp-use.com), February 2026.
Part of [Switch](https://switchai.dev) — the AI model routing platform.
