import { McpUseProvider, useWidget, type WidgetMetadata } from "mcp-use/react";
import React, { useState, useCallback } from "react";
import { z } from "zod";
import ContextGraph from "../components/ContextGraph";
import type { ContextGraphNode, ContextGraphEdge } from "../components/ContextGraph";

const nodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  category: z.enum(["fact", "preference", "project", "code", "decision"]),
  source: z.enum(["chatgpt", "claude", "gemini", "perplexity"]),
  x: z.number(),
  y: z.number(),
  confidence: z.number(),
});

const edgeSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export const propSchema = z.object({
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
});

type ContextGraphWidgetProps = z.infer<typeof propSchema>;

export const widgetMetadata: WidgetMetadata = {
  description: "Interactive SVG knowledge graph showing user context as nodes and edges",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: false,
    invoking: "Loading context graph...",
    invoked: "Context graph loaded",
  },
};

const ContextGraphWidget: React.FC = () => {
  const { props, isPending } = useWidget<ContextGraphWidgetProps>();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const handleNodeSelect = useCallback(
    (nodeId: string | null, _connectedIds: Set<string>) => {
      setSelectedNodeId(nodeId);
    },
    []
  );

  if (isPending) {
    return (
      <McpUseProvider>
        <div
          style={{
            background: "#0a0a0f",
            padding: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "200px",
          }}
        >
          <span
            style={{
              color: "#6b6b7b",
              fontFamily: "monospace",
              fontSize: "12px",
            }}
          >
            Loading context graph...
          </span>
        </div>
      </McpUseProvider>
    );
  }

  const { nodes, edges } = props;

  const ctxPercent = selectedNodeId
    ? Math.round((1 / nodes.length) * 100)
    : 0;
  const circumference = 2 * Math.PI * 14;
  const dashOffset = circumference - (ctxPercent / 100) * circumference;

  return (
    <McpUseProvider>
      <div
        style={{
          background: "#0a0a0f",
          borderRadius: "12px",
          border: "1px solid #1e1e2e",
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
          nodes={nodes as ContextGraphNode[]}
          edges={edges as ContextGraphEdge[]}
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
    </McpUseProvider>
  );
};

export default ContextGraphWidget;
