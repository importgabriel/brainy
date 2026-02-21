import React, { useState, useCallback } from "react";
import ContextGraph from "./components/ContextGraph";
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

const App: React.FC = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const handleNodeSelect = useCallback(
    (nodeId: string | null, _connectedIds: Set<string>) => {
      setSelectedNodeId(nodeId);
    },
    []
  );

  const ctxPercent = selectedNodeId
    ? Math.round((1 / nodes.length) * 100)
    : 0;
  const circumference = 2 * Math.PI * 14;
  const dashOffset = circumference - (ctxPercent / 100) * circumference;

  return (
    <div
      style={{
        background: "#0a0a0f",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "700px",
          border: "1px solid #1e1e2e",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        {/* Header bar */}
        <div
          style={{
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #1e1e2e",
          }}
        >
          {/* Left side: logo + text */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "7px",
                background: "linear-gradient(135deg, #7c6aff, #ec4899)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  fontSize: "14px",
                  color: "#ffffff",
                  lineHeight: 1,
                }}
              >
                S
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#e0e0e0",
                  letterSpacing: "-0.3px",
                  lineHeight: 1.2,
                }}
              >
                SwitchMemory
              </span>
              <span
                style={{
                  fontSize: "10px",
                  color: "#555555",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  marginTop: "1px",
                  lineHeight: 1.2,
                }}
              >
                Universal Context Graph
              </span>
            </div>
          </div>

          {/* Right side: confidence meter */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <span
              style={{
                fontSize: "9px",
                color: "#555555",
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginRight: "6px",
              }}
            >
              CTX
            </span>
            <svg width="36" height="36" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="14"
                stroke="#1e1e2e"
                strokeWidth="3"
                fill="none"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                stroke="#7c6aff"
                strokeWidth="3"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{
                  transform: "rotate(-90deg)",
                  transformOrigin: "50% 50%",
                  transition: "stroke-dashoffset 0.3s ease",
                }}
              />
              <text
                x="18"
                y="18"
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fontSize: "9px",
                  fill: "#e0e0e0",
                  fontWeight: 600,
                }}
              >
                {ctxPercent}%
              </text>
            </svg>
          </div>
        </div>

        {/* Graph */}
        <ContextGraph
          nodes={nodes}
          edges={edges}
          onNodeSelect={handleNodeSelect}
        />

        {/* Footer bar */}
        <div
          style={{
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #1e1e2e",
          }}
        >
          <span style={{ fontSize: "10px", color: "#444444", letterSpacing: "0.3px" }}>
            {nodes.length} nodes
            <span style={{ margin: "0 3px" }}>&middot;</span>
            {edges.length} edges
            <span style={{ margin: "0 3px" }}>&middot;</span>
            {selectedNodeId ? 1 : 0} active
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            {([
              { name: "ChatGPT", color: "#10a37f" },
              { name: "Claude", color: "#d97706" },
              { name: "Gemini", color: "#4285f4" },
              { name: "Cursor", color: "#888888" },
            ] as const).map((p) => (
              <div
                key={p.name}
                title={p.name}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: p.color,
                  border: `1px solid ${p.color}4d`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
