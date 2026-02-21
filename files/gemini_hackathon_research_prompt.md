# Gemini Deep Research Prompt — SwitchMemory Technical Spec & Viability

---

**Role:** You are a senior AI infrastructure architect and venture strategist who has built production MCP servers, shipped Chrome extensions with 100K+ users, and advised YC-batch startups on hackathon strategy. You understand both the technical implementation details of MCP (Model Context Protocol) and the venture capital dynamics of the AI memory/context space in 2026. Conduct exhaustive research and produce a report that is both technically implementable and strategically sound.

**Context — The Hackathon:**

We are building "SwitchMemory" for the Manufact (mcp-use) MCP Apps Hackathon at Y Combinator on February 21, 2026. Manufact (formerly mcp-use, YC S25) just raised $6.3M from Peak XV, YC, Pioneer Fund, and Liquid 2 Ventures. Their SDK has 5M+ downloads and 9K GitHub stars. The hackathon requires all projects to use the mcp-use SDK. The top prize is a guaranteed YC interview.

**Evaluation Criteria (100 Points Total):**
- **Novelty & Creativity:** 30 points — How original is the idea?
- **Real-World Usefulness:** 30 points — Does it solve a genuine problem?
- **Widget-Model Interaction:** 20 points — How well does the project leverage TWO-WAY communication between widgets and the model? (Widget → Model AND Model → Widget)
- **UI:** 10 points — Visual polish and design quality
- **Production Readiness:** 10 points — Could this ship? Deployment, error handling, robustness

**Context — What We're Building:**

SwitchMemory is a universal AI context/memory layer built as an MCP App. It has three components:

1. **MCP Server** (built with mcp-use SDK) — Exposes tools for saving, searching, retrieving, and managing persistent user memories across all AI platforms.

2. **Interactive Widget** (MCP App UI) — A visual memory panel that renders INSIDE ChatGPT, Claude, and other MCP-compatible clients. Shows real-time memory extraction, lets users manage context, and provides routing recommendations. This is where the two-way Widget-Model Interaction happens.

3. **Chrome Extension** (listener layer) — Passively observes conversations across AI platforms, extracts structured context, and feeds it into the MCP server.

**Context — Our Parent Product:**

SwitchMemory is Phase 2 of Switch (switchai.dev), an AI model routing platform. Switch already has:
- Context-aware routing classifier (GPT-4.1 Mini) that selects the best AI for each prompt
- Routing decisions logging table with feedback signals
- Conversation memory summaries stored in Postgres
- Compare Mode that runs prompts against 4 models simultaneously
- Full tier system with Stripe billing scaffolded
- Built on Next.js, Supabase, TypeScript

The unique angle: SwitchMemory doesn't just remember — it recommends. It combines persistent memory with routing intelligence. No competitor does this.

**Context — The Competitive Landscape We've Already Identified:**

- **Mem0 / OpenMemory** — $24M raised (Seed + Series A). MCP server, Chrome extension, API. Developer/enterprise focused. No routing intelligence.
- **AI Context Flow** — Chrome extension, "Memory Studio," Ctrl+I injection into chat UIs. No MCP-native architecture. Manual memory management.
- **MemoryPlugin** — Browser ext + Custom GPTs + MCP. Fact-based storage. Lightweight. $5-10/mo.
- **Ascend** — Chrome extension, profile-based (static) context injection. No MCP.
- **myNeutron** — Full-browsing capture in Chrome. Privacy concerns. Not AI-conversation specific.
- **OpenAI native memory** — ChatGPT-only. Cannot export. Platform-locked.
- **Anthropic native memory** — Claude-only. Best export/import but still siloed.

---

## RESEARCH QUESTIONS — Answer Each As Its Own Detailed Section

---

### SECTION 1: Widget-Model Interaction Architecture (CRITICAL — 20% of score)

This is the most technical and differentiated scoring category. Research exhaustively:

**1A. What is Manufact's MCP Apps SDK widget system?**
- How do MCP Apps render interactive UI components inside ChatGPT and Claude?
- What is the Apps SDK's component model? React? HTML? Custom DSL?
- What UI primitives are available (buttons, toggles, cards, lists, inputs, charts)?
- How does the two-way communication protocol work technically? How does a widget send data to the model? How does the model trigger widget updates?
- Find and analyze examples of MCP Apps that scored well in previous Manufact hackathons or showcases. What interaction patterns did they use?
- Research Manufact's GitHub repos (github.com/mcp-use) for example apps — specifically `diagram-mcp-app`, `remotion-mcp-app`, and any others. How do they handle widget-model communication?

**1B. Design the two-way interaction spec for SwitchMemory's widget:**

For Widget → Model direction, spec out:
- User clicks "Load Context" button in widget → relevant memories are injected into the model's active context
- User toggles individual memory cards on/off → model's available context updates in real-time
- User edits a memory inline in the widget → updated fact replaces the old one in the model's context
- User clicks "What should I use for this?" → triggers the routing recommendation engine
- User rates a memory as "helpful" or "not relevant" → feedback signal stored for future retrieval tuning

For Model → Widget direction, spec out:
- Model detects a new fact worth remembering during conversation → calls `save_memory` MCP tool → widget live-updates with a new memory card appearing (with animation)
- Model assesses conversation topic → widget updates a "context confidence" meter showing how much relevant context is loaded (0-100%)
- Model detects the user would be better served by a different AI → widget shows a "routing suggestion" card: "Claude would handle this coding question better — based on your history of similar tasks"
- Model detects conflicting information with existing memories → widget highlights the conflict and asks user to resolve
- Model completes a conversation → widget shows a "session summary" of new memories captured

**1C. What interaction patterns will score highest with hackathon judges?**
- Research what "two-way communication" means in the context of MCP Apps specifically
- What are the anti-patterns? (e.g., widget that's just a display panel with no interactivity, or model that never triggers widget updates)
- What makes judges say "wow" for widget interaction? Real-time reactivity? Bidirectional state sync? Complex multi-step workflows?

---

### SECTION 2: Technical Implementation — MCP Server Spec

**2A. MCP Tools to Expose:**

Research best practices from Mem0's MCP server, Basic Memory MCP, Knowledge Graph MCP, and others. Then spec out the exact tools SwitchMemory should expose:

For each tool, define: name, description, input schema (JSON), output schema, and example usage.

Minimum tools needed:
- `save_memory` — Store a new memory (structured fact, preference, project context, code pattern)
- `search_memories` — Semantic search across all stored memories
- `get_context_for_topic` — Given a conversation topic, return the most relevant memories (smart retrieval, not dump)
- `list_memories` — Browse memories with filters (by category, date, source platform, project)
- `update_memory` — Edit an existing memory
- `delete_memory` — Remove a memory
- `get_routing_suggestion` — Given a prompt + user's memory profile, recommend which AI model would handle it best
- `get_user_profile` — Return a structured summary of everything known about the user
- `log_feedback` — Record whether injected context was helpful or not (for retrieval tuning)

**2B. Memory Object Schema:**

Research how Mem0, MemoryPlugin, and others structure their memory objects. Design a schema that supports:
- Different memory types: facts, preferences, project_context, code_patterns, communication_style, decisions
- Source tracking: which platform and conversation the memory came from
- Confidence scoring: how certain is this memory? (extracted vs. explicitly stated)
- Temporal relevance: some memories decay, some are permanent
- Tagging and categorization for retrieval
- Conflict resolution: what happens when a new fact contradicts an old one?

**2C. Semantic Search Architecture:**

For a hackathon MVP, what's the fastest path to working semantic search?
- pgvector with Supabase (we already have Supabase) vs. in-memory vector store vs. external service
- Embedding model selection: what's the best lightweight embedding model for memory retrieval in 2026?
- How to handle the retrieval threshold: too many memories = noise, too few = missing context
- How does Mem0 achieve "90% fewer tokens than full-context" while scoring "26% higher than OpenAI memory"? What's the technical approach?

---

### SECTION 3: Chrome Extension Architecture

**3A. Conversation Observation:**
- How do you reliably extract conversation text from ChatGPT, Claude, and Gemini web interfaces?
- What DOM structures does each platform use? How stable are they? How often do they break?
- Content script vs. MutationObserver vs. network request interception — which approach is most robust?
- What are the Chrome Web Store policies for extensions that read AI chat content? What gets rejected?
- How do existing extensions (Mem0 Chrome Extension, AI Context Flow, Chat Memo) handle this technically?

**3B. Context Extraction Pipeline:**
- Raw conversation text → structured memory objects. What's the extraction approach?
- Use an LLM call (GPT-4.1 Mini/Nano) to extract facts? Or rules-based extraction? Or hybrid?
- What's the latency and cost per conversation processed?
- How do you handle deduplication? (User mentions "I work at Google" in 50 conversations — store once, not 50 times)
- How do you handle contradiction resolution? (User said "I prefer Python" last month, says "I switched to Rust" today)

**3C. Privacy & Security:**
- All conversation content flows through the extension. What's the privacy architecture?
- Local-only processing vs. cloud processing? Tradeoffs for a hackathon vs. production?
- How do competitors handle GDPR, CCPA, and health/financial data in conversations?
- What's the Chrome Web Store review process for conversation-reading extensions? Average approval time? Common rejection reasons?

---

### SECTION 4: Novelty & Creativity Optimization (30% of score)

**4A. What makes this novel vs. existing solutions?**

Research each competitor's approach and identify specifically what SwitchMemory does that nobody else does:

- **Memory + Routing:** No competitor combines persistent context with model selection intelligence. Research whether any startup, paper, or project has attempted this combination. If not, this is genuine whitespace.
- **Passive observation + Active intelligence:** Most tools require manual memory curation or dump everything. Research the state of the art in automatic, intelligent context extraction from conversations.
- **The "memory with opinions" concept:** The widget doesn't just store — it actively suggests which AI platform to use based on accumulated context. Research whether any product offers "context-aware AI recommendation" as a feature.
- **MCP-native architecture:** Most competitors are Chrome extensions that inject into chat UIs. SwitchMemory is built on MCP as a first-class integration. Research how many memory tools are MCP-native vs. MCP-added-later.

**4B. What creative interaction patterns could push novelty score higher?**

Research and propose 3-5 creative features that judges haven't seen before:
- Example concepts to research feasibility on: "Memory Diff" (show what changed about the user's context between sessions), "Context Replay" (replay how memories evolved over a project's lifetime), "AI Personality Mirror" (widget shows how each AI platform perceives/uses your context differently), "Memory Marketplace" (share anonymized context templates — "startup founder context pack," "PhD researcher context pack")
- What creative MCP App interactions have won previous hackathons? What patterns get the most attention?

---

### SECTION 5: Real-World Usefulness Validation (30% of score)

**5A. Quantify the problem:**
- How many professionals use 2+ AI platforms daily? Research surveys, reports, usage data from 2025-2026.
- What's the actual time cost of context rebuilding? The claim "200+ hours annually" — can you verify or improve this number?
- What are the top 3 use cases where context loss causes the most pain? (Coding across Cursor/Claude/ChatGPT? Research across Perplexity/Gemini? Creative work across multiple tools?)
- Interview-style evidence: what do power users say about this problem? Any Reddit threads, Twitter/X discussions, forum posts?

**5B. Demo scenarios that prove usefulness to judges:**
- Design 3 demo flows that would make a hackathon judge immediately understand the value. Each should be completable in under 2 minutes.
- The demos should show different use cases: developer workflow, business professional, creative professional.
- What's the "aha moment" for each demo? When does the judge go from "okay" to "I need this"?

---

### SECTION 6: VC Plausibility & Post-Hackathon Strategy

**6A. Is this venture-backable?**
- Map every VC that has invested in AI memory, context management, or MCP infrastructure. Include fund name, partner, check size, and what they funded.
- What's the realistic TAM for universal AI memory as a product category?
- How does the "memory + routing" combination change the investment thesis vs. a pure memory play like Mem0?
- What would a pre-seed raise look like for this? Valuation range, amount, target investors?

**6B. Path from hackathon to product:**
- If we win the YC interview, what do we need to show in that interview?
- 30-day post-hackathon roadmap to first paying users
- 90-day roadmap to pre-seed metrics
- What's the realistic path to $1M ARR?

**6C. Risk map:**
- Top 5 existential risks, ranked by probability and severity
- What happens when OpenAI ships cross-platform memory natively?
- What happens when Anthropic makes Claude's memory exportable/portable?
- Is Mem0 at $24M too far ahead?
- Chrome extension fragility — platforms change DOM, Google changes policies
- Data privacy regulatory exposure

---

### SECTION 7: Hackathon Execution Plan — Hour-by-Hour

Given the evaluation criteria weights (Novelty 30, Usefulness 30, Widget Interaction 20, UI 10, Production 10), produce:

**7A. An hour-by-hour build schedule for a solo developer over 10 hours:**

Allocate time proportional to scoring weight. Suggest what to build first, what to build last, and what to skip entirely.

Identify the critical path — what's the minimum viable demo that scores well across ALL five categories?

**7B. The exact demo script:**

Write the 3-minute demo presentation script. What do you show first? What's the narrative arc? When do you show widget interaction? When do you show the cross-platform transfer? When do you show the routing recommendation?

Structure it as: Hook (15 sec) → Problem (30 sec) → Demo (90 sec) → Novelty callout (30 sec) → Close (15 sec)

**7C. What NOT to build:**
- Features that won't score points in any category
- Complexity traps that eat time without improving scores
- Things that look impressive but judges won't care about

---

**Output Format Requirements:**
- Be technically specific. Include actual code patterns, API schemas, and architecture diagrams where relevant.
- Use real numbers. Real funding amounts, real pricing, real download counts, real traction data.
- Cite every factual claim. If you can't verify something, say "unverified" explicitly.
- Produce a final **SCORECARD PREDICTION** — estimate how SwitchMemory would score on each of the 5 criteria if built according to your recommendations, and identify which category has the most room for improvement.
- End with a **BUILD vs. SKIP** decision matrix: for every feature discussed, mark it as BUILD (include in hackathon), DEFER (post-hackathon), or SKIP (don't build ever).

---
