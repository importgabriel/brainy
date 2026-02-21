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

  return (
    <McpUseProvider>
      <div
        style={{
          background: "#0a0a0f",
          padding: "16px",
          borderRadius: "12px",
        }}
      >
        <h2
          style={{
            color: "#e2e2e8",
            fontFamily: "monospace",
            fontSize: "13px",
            margin: "0 0 12px 0",
            letterSpacing: "0.05em",
          }}
        >
          SwitchMemory — Context Graph
          {selectedNodeId && (
            <span style={{ color: "#7c6aff", marginLeft: "10px" }}>
              [{selectedNodeId}]
            </span>
          )}
        </h2>
        <div
          style={{
            border: "1px solid #1e1e2e",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <ContextGraph
            nodes={nodes as ContextGraphNode[]}
            edges={edges as ContextGraphEdge[]}
            onNodeSelect={handleNodeSelect}
          />
        </div>
      </div>
    </McpUseProvider>
  );
};

export default ContextGraphWidget;
