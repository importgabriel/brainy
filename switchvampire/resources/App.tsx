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
      <h1
        style={{
          color: "#e2e2e8",
          fontFamily: "monospace",
          fontSize: "14px",
          marginBottom: "16px",
          letterSpacing: "0.05em",
        }}
      >
        SwitchMemory — Context Graph
        {selectedNodeId && (
          <span style={{ color: "#7c6aff", marginLeft: "12px" }}>
            [{selectedNodeId}]
          </span>
        )}
      </h1>
      <div
        style={{
          width: "100%",
          maxWidth: "700px",
          border: "1px solid #1e1e2e",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <ContextGraph
          nodes={nodes}
          edges={edges}
          onNodeSelect={handleNodeSelect}
        />
      </div>
    </div>
  );
};

export default App;
