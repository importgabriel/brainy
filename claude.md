# SwitchMemory — Project Context

## What This Is
SwitchMemory is a universal AI context/memory layer built as an MCP App for the **Manufact (mcp-use) MCP Apps Hackathon at Y Combinator** on February 21, 2026. The top prize is a guaranteed YC interview.

**One-liner:** A portable AI memory that remembers everything about you across ChatGPT, Claude, Gemini, and Cursor — visualized as a live context graph — so you never explain yourself twice.

## Parent Company
SwitchMemory is Phase 2 of **Switch** (switchai.dev), an AI model routing platform ("Kayak for AI"). Switch already has:
- Context-aware routing classifier (GPT-4.1 Mini)
- Routing decisions logging with feedback signals
- Conversation memory summaries in Postgres
- Compare Mode (4 models simultaneously)
- Full tier system with Stripe billing scaffolded
- Built on Next.js 14, Supabase, TypeScript

## Team
- **Wayne** — CEO/Frontend. Building the widget, Chrome extension, UI
- **Teammate** — Backend/DB. Building the MCP server, Supabase tables, pgvector search

## Hackathon Evaluation Criteria (100 points)
| Category | Points | Our Strategy |
|----------|--------|-------------|
| Novelty & Creativity | 30 | Memory + routing intelligence combo. No competitor does both. "Memory with opinions." |
| Real-World Usefulness | 30 | Cross-platform context persistence. The "Tab Graveyard" problem. 200+ hrs/year lost to context rebuilding. |
| Widget-Model Interaction | 20 | **CRITICAL.** Two-way communication: Widget → Model (user clicks node → context injected) AND Model → Widget (model extracts fact → new node appears in graph). |
| UI | 10 | Context graph visualization. Dark theme. Provider accent colors. Polished, not generic. |
| Production Readiness | 10 | Deployed on Manufact MCP Cloud. Supabase backend. Error handling. |

## Tech Stack
- **MCP Framework:** mcp-use SDK by Manufact (@mcp-use/create-app)
- **Widget UI:** React + TypeScript (rendered inside ChatGPT/Claude via MCP Apps)
- **Graph Visualization:** D3.js force graph or custom SVG
- **Backend:** MCP server (TypeScript) via mcp-use SDK
- **Database:** Supabase (PostgreSQL + pgvector for semantic search)
- **Embeddings:** Mistral Embed API or OpenAI text-embedding-3-small
- **Chrome Extension:** Manifest V3, MutationObserver on ChatGPT DOM
- **Deployment:** Manufact MCP Cloud

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   User's Browser                 │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ ChatGPT  │  │  Claude   │  │  Gemini  │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │              │              │              │
│  ┌────┴──────────────┴──────────────┴────┐       │
│  │       Chrome Extension (Listener)      │       │
│  │  MutationObserver → Extract → Save     │       │
│  └───────────────────┬───────────────────┘       │
└──────────────────────┼───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│              MCP Server (mcp-use SDK)             │
│                                                    │
│  Tools:                                            │
│  ├── save_memory          (store new fact)         │
│  ├── search_memories      (semantic vector search) │
│  ├── get_context_for_topic (smart retrieval)       │
│  ├── list_memories        (browse with filters)    │
│  ├── update_memory        (edit existing)          │
│  ├── delete_memory        (remove)                 │
│  ├── get_routing_suggestion (which AI is best?)    │
│  ├── get_user_profile     (synthesized summary)    │
│  └── log_feedback         (was context helpful?)   │
│                                                    │
│  Widget (React):                                   │
│  ├── Context Graph (SVG/D3 force graph)            │
│  ├── Live Stream (MCP tool invocation log)         │
│  └── Collaborate (share with team)                 │
└───────────────────┬──────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────┐
│               Supabase (PostgreSQL)               │
│                                                    │
│  Tables:                                           │
│  ├── memories        (id, content, category,       │
│  │                    source_platform, confidence,  │
│  │                    embedding vector, user_id,    │
│  │                    project_id, created_at)       │
│  ├── memory_edges    (from_id, to_id, strength)    │
│  ├── projects        (id, name, owner_id)          │
│  ├── collaborators   (project_id, user_id, role)   │
│  └── feedback        (memory_id, is_helpful)       │
│                                                    │
│  Extensions: pgvector (vector similarity search)   │
└──────────────────────────────────────────────────┘
```

## Widget-Model Interaction (THE MOST IMPORTANT SECTION)

### Widget → Model (User actions that affect the AI)
1. **Click node** → `callTool('get_context_for_topic', { memory_ids: [...] })` → Selected subgraph injected into model context
2. **Toggle node off** → `callTool('update_active_context', { remove: memory_id })` → Node grays out, model loses that context
3. **Edit memory inline** → `callTool('update_memory', { memory_id, updated_fact })` → Model's working knowledge updates
4. **Click "Route This Context"** → `callTool('get_routing_suggestion', { prompt, task_type })` → Widget shows recommendation card
5. **Rate memory** → `callTool('log_feedback', { memory_id, is_helpful })` → Future retrieval weights adjusted

### Model → Widget (AI actions that update the UI)
1. **Model detects new fact** → calls `save_memory` tool → Widget animates new node appearing in graph with edges drawing to related nodes
2. **Model assesses topic** → returns context_confidence score → Circular gauge meter in widget header updates (0-100%)
3. **Model detects better AI for task** → returns routing suggestion → Widget renders recommendation card with provider color accent
4. **Model finds conflicting memory** → returns conflict object → Widget highlights conflicting nodes in red
5. **Session ends** → model calls summary tool → Widget shows session summary of new/updated memories

### How MCP Apps SDK Works (Technical)
- Widget = React component in `resources/` directory
- `@mcp-use/cli` bundles React into optimized HTML
- Widget renders inside ChatGPT/Claude via sandboxed iframe
- Widget uses `useMcp()` React hook from `@mcp-use/react`
- `callTool(name, args)` sends request through host client → MCP server
- Server returns `structuredContent` + `_meta` (UI refresh signal)
- `_meta` uses resource URI: `ui://widget/memory-panel.html`
- Model pushes status via `openai/toolInvocation/invoking` key

## Memory Object Schema

```typescript
interface Memory {
  id: string;                          // uuid
  content: string;                     // "User prefers TypeScript over JavaScript"
  category: 'fact' | 'preference' | 'project' | 'code' | 'decision';
  source_platform: 'chatgpt' | 'claude' | 'gemini' | 'perplexity';
  confidence: number;                  // 0.0 - 1.0
  embedding: number[];                 // vector from embedding model
  user_id: string;
  project_id?: string;                 // for project-level sharing
  shared_scope: 'private' | 'project' | 'chat';
  created_at: string;                  // ISO timestamp
  updated_at: string;
  decay_rate: 'permanent' | 'session' | 'weekly';
  version: number;                     // for conflict resolution
  metadata: {
    conversation_id?: string;
    extracted_by: 'passive_listener' | 'explicit_save' | 'model_detected';
  }
}

interface MemoryEdge {
  id: string;
  from_memory_id: string;
  to_memory_id: string;
  strength: number;                    // 0.0 - 1.0 (semantic similarity)
  created_at: string;
}
```

## Collaboration / Sharing Model

Three sharing scopes:
1. **Project Level** — All collaborators on a project see the full context graph. Use case: startup team shares company context.
2. **Chat Level** — Share context from a specific conversation thread. Use case: share research findings from one Perplexity session.
3. **Node Level** — Share individual memory nodes. Use case: share a specific code pattern or decision.

Roles: Owner (full control), Editor (add/edit/delete memories), Viewer (read-only graph access)

## Competitive Positioning

| Us (SwitchMemory) | Mem0 ($24M) | AI Context Flow | MemoryPlugin |
|---|---|---|---|
| Memory + Routing intelligence | Memory only | Memory only | Memory only |
| Context graph visualization | Dashboard/list | List + manual | Fact list |
| MCP-native architecture | MCP added later | Chrome ext only | Browser ext + GPT |
| Passive + intelligent extraction | API-driven | Manual curation | Semi-auto |
| Real-time widget inside chat | External dashboard | Ctrl+I injection | Sidebar |
| Collaborative sharing | Enterprise/team | Single user | Single user |

## Design System

```
Colors:
  Background:     #0a0a0f
  Surface:        #12121a
  Border:         #1e1e2e
  Text:           #e2e2e8
  Text Muted:     #6b6b7b
  Accent:         #7c6aff

Platform Accents:
  ChatGPT:        #10a37f (green)
  Claude:         #d97706 (amber)
  Gemini:         #4285f4 (blue)
  Perplexity:     #8b5cf6 (purple)

Category Colors:
  Fact:           #3b82f6 (blue)
  Preference:     #10b981 (green)
  Project:        #f59e0b (amber)
  Code:           #ec4899 (pink)
  Decision:       #8b5cf6 (purple)

Font:             JetBrains Mono / SF Mono / Fira Code
Theme:            Dark only
Border Radius:    8px (cards), 6px (buttons), 12px (overlays)
```

## Demo Script (3 minutes)

**Hook (0:00-0:15):** "Developers lose 90 minutes every day to context switching. Every time you move from ChatGPT to Claude, your AI gets amnesia. SwitchMemory eliminates that."

**Problem (0:15-0:45):** Show typing a database schema discussion in ChatGPT. Point out the Chrome extension passively listening. Graph widget shows nodes appearing in real-time as facts are extracted.

**Demo (0:45-2:15):** "I need a SQL migration for this schema." Widget lights up routing suggestion: "Claude 3.7 handles SQL migrations 40% better for your patterns." Click accept. Claude opens with full context pre-loaded. Click a node cluster in the graph — show context injection. Toggle a node off — show the model losing that context. Two-way, live, visible.

**Novelty (2:15-2:45):** "Mem0 is a great database. SwitchMemory is an intelligent routing layer. We don't just store — we recommend. That's the whitespace."

**Close (2:45-3:00):** "SwitchMemory: Write once, remember everywhere. Built on mcp-use, powered by Supabase, ready for YC."

## Build Priority (for frontend)

1. **Context Graph widget** (hours 1-3) — SVG graph, nodes, edges, click-to-select, subgraph highlighting, `useMcp` hook integration
2. **Routing suggestion card** (hour 4) — Overlay with provider colors, accept/dismiss, reason text
3. **Live Stream tab** (hour 5) — Real-time MCP tool invocation log
4. **Collaborate tab** (hour 6) — Sharing scopes, team list, invite flow
5. **Context Confidence Meter** (hour 7) — Circular gauge in header
6. **Chrome extension MVP** (hours 8-9) — MutationObserver on ChatGPT, extract text, call save_memory
7. **Polish + rehearse** (hour 10) — Animations, loading states, demo script practice

## What NOT to Build
- ❌ Spring physics animation on graph (simple fade-in is fine)
- ❌ Lasso multi-select on graph (click single nodes only)
- ❌ Real-time Context Diffing (architecturally impossible in timeframe)
- ❌ AI Personality Mirror (creative concept, not buildable today)
- ❌ Stripe billing (mockup only if needed)
- ❌ Multi-platform Chrome extension (ChatGPT only for demo)
- ❌ Local PII scrubbing (production concern, not hackathon)
- ❌ Redux/complex state management (useState + useMcp hook only)