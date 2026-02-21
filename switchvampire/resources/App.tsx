import React, { useState, useCallback, useMemo } from "react";
import ContextGraph from "./components/ContextGraph";
import NodeDetail from "./components/NodeDetail";
import QueryBar from "./components/QueryBar";
import type { ContextGraphNode, ContextGraphEdge } from "./components/ContextGraph";

const nodes: ContextGraphNode[] = [
  { id: "nextjs", label: "Next.js", category: "project", source: "claude", x: 350, y: 80, confidence: 0.95 },
  { id: "typescript", label: "TypeScript", category: "project", source: "chatgpt", x: 200, y: 130, confidence: 0.9 },
  { id: "supabase", label: "Supabase", category: "project", source: "claude", x: 500, y: 130, confidence: 0.85 },
  { id: "pgvector", label: "pgvector", category: "code", source: "chatgpt", x: 600, y: 220, confidence: 0.7 },
  { id: "ceo", label: "CEO Role", category: "fact", source: "claude", x: 100, y: 250, confidence: 0.8 },
  { id: "preseed", label: "Pre-seed Raise", category: "decision", source: "perplexity", x: 250, y: 320, confidence: 0.75 },
  { id: "uga", label: "UGA Target", category: "fact", source: "gemini", x: 400, y: 380, confidence: 0.6 },
  { id: "kayak", label: "Kayak for AI", category: "project", source: "chatgpt", x: 150, y: 380, confidence: 0.85 },
  { id: "darktheme", label: "Dark Theme Pref", category: "preference", source: "claude", x: 550, y: 320, confidence: 0.65 },
  { id: "concise", label: "Concise Pref", category: "preference", source: "chatgpt", x: 450, y: 250, confidence: 0.6 },
  { id: "gpt4mini", label: "GPT-4.1 Mini Router", category: "code", source: "chatgpt", x: 300, y: 200, confidence: 0.8 },
  { id: "starter", label: "$14.99 Starter Tier", category: "decision", source: "perplexity", x: 100, y: 130, confidence: 0.7 },
];

const edges: ContextGraphEdge[] = [
  { from: "nextjs", to: "typescript" },
  { from: "nextjs", to: "supabase" },
  { from: "supabase", to: "pgvector" },
  { from: "nextjs", to: "gpt4mini" },
  { from: "typescript", to: "gpt4mini" },
  { from: "ceo", to: "preseed" },
  { from: "ceo", to: "kayak" },
  { from: "preseed", to: "starter" },
  { from: "kayak", to: "gpt4mini" },
  { from: "kayak", to: "uga" },
  { from: "darktheme", to: "concise" },
  { from: "supabase", to: "darktheme" },
  { from: "starter", to: "uga" },
  { from: "pgvector", to: "gpt4mini" },
  { from: "preseed", to: "uga" },
];

const noop = () => {};

/* ── Header ──────────────────────────────────────────── */

const Header: React.FC<{ confidencePercent: number }> = ({ confidencePercent }) => (
  <div
    style={{
      padding: "12px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: "1px solid #1f2430",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div
        style={{
          width: "26px",
          height: "26px",
          borderRadius: "6px",
          background: "rgba(91, 108, 255, 0.14)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: "13px",
            color: "#5b6cff",
            lineHeight: 1,
          }}
        >
          S
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#e6eaf2",
            letterSpacing: "-0.2px",
            lineHeight: 1.2,
          }}
        >
          SwitchMemory
        </span>
        <span
          style={{
            fontSize: "10px",
            color: "#6b7280",
            letterSpacing: "0.3px",
            marginTop: "1px",
            lineHeight: 1.2,
          }}
        >
          Universal Context Graph
        </span>
      </div>
    </div>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        border: "1px solid #1f2430",
        borderRadius: "6px",
        padding: "4px 10px",
      }}
    >
      <span
        style={{
          fontSize: "10px",
          color: "#6b7280",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
        }}
      >
        CTX
      </span>
      <span
        style={{
          fontSize: "11px",
          color: "#5b6cff",
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {confidencePercent}%
      </span>
    </div>
  </div>
);

/* ── Footer ──────────────────────────────────────────── */

const PLATFORMS = [
  { name: "ChatGPT", color: "#10a37f" },
  { name: "Claude", color: "#d97706" },
  { name: "Gemini", color: "#4285f4" },
  { name: "Perplexity", color: "#8b5cf6" },
] as const;

const Footer: React.FC<{
  nodeCount: number;
  edgeCount: number;
  activeCount: number;
}> = ({ nodeCount, edgeCount, activeCount }) => (
  <div
    style={{
      padding: "10px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderTop: "1px solid #1f2430",
    }}
  >
    <span style={{ fontSize: "11px", color: "#6b7280", letterSpacing: "0.2px" }}>
      {nodeCount} nodes
      <span style={{ margin: "0 4px", opacity: 0.4 }}>&middot;</span>
      {edgeCount} edges
      <span style={{ margin: "0 4px", opacity: 0.4 }}>&middot;</span>
      {activeCount} active
    </span>
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      {PLATFORMS.map((p) => (
        <div
          key={p.name}
          title={p.name}
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: p.color,
            opacity: 0.5,
          }}
        />
      ))}
    </div>
  </div>
);

/* ── App ─────────────────────────────────────────────── */

const App: React.FC = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  /* Compute relevant node IDs from query (frontend-only string match) */
  const relevantNodeIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return new Set<string>();
    return new Set(
      nodes
        .filter((n) => {
          const label = (n.label || "").toLowerCase();
          const category = (n.category || "").toLowerCase();
          const source = (n.source || "").toLowerCase();
          return label.includes(q) || category.includes(q) || source.includes(q);
        })
        .map((n) => n.id)
    );
  }, [query]);

  const handleNodeSelect = useCallback(
    (nodeId: string | null, _connectedIds: Set<string>) => {
      setSelectedNodeId(nodeId);
    },
    []
  );

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null),
    [selectedNodeId]
  );

  const connectionCount = useMemo(() => {
    if (!selectedNodeId) return 0;
    return edges.filter((e) => e.from === selectedNodeId || e.to === selectedNodeId).length;
  }, [selectedNodeId]);

  /* CTX meter: relevance-based when query is active */
  const relevantCount = relevantNodeIds.size;
  const activeRelevantCount =
    selectedNodeId && relevantNodeIds.has(selectedNodeId) ? 1 : 0;
  const confidencePercent =
    relevantCount > 0
      ? Math.round((activeRelevantCount / relevantCount) * 100)
      : 0;

  return (
    <div
      style={{
        background: "#0f1115",
        minHeight: "100vh",
        color: "#e6eaf2",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          padding: 0,
        }}
      >
        <div
          style={{
            border: "1px solid #1f2430",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <Header confidencePercent={confidencePercent} />
          <QueryBar
            query={query}
            onChangeQuery={setQuery}
            relevantCount={relevantCount}
            activeRelevantCount={activeRelevantCount}
            onClear={() => setQuery("")}
          />
          <ContextGraph
            nodes={nodes}
            edges={edges}
            onNodeSelect={handleNodeSelect}
          />
          {selectedNode && (
            <NodeDetail
              node={selectedNode}
              connectionCount={connectionCount}
              onRoute={noop}
              onEdit={noop}
              onDelete={noop}
            />
          )}
          <Footer
            nodeCount={nodes.length}
            edgeCount={edges.length}
            activeCount={selectedNodeId ? 1 : 0}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
