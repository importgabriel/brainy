import React, { useState, useMemo, useCallback, useRef } from "react";

export interface ContextGraphNode {
  id: string;
  label: string;
  fullContent: string;
  category: "fact" | "preference" | "project" | "code" | "decision";
  source: "chatgpt" | "claude" | "gemini" | "perplexity";
  x: number;
  y: number;
  confidence: number;
}

export type EdgeRelationship =
  | "related_to" | "part_of" | "contradicts"
  | "supersedes" | "depends_on" | "used_in";

export interface ContextGraphEdge {
  from: string;
  to: string;
  relationship?: EdgeRelationship;
  weight?: number;
}

const EDGE_COLORS: Record<EdgeRelationship, string> = {
  related_to:  "#45455a",
  part_of:     "#3b82f6",
  contradicts: "#ef4444",
  supersedes:  "#f59e0b",
  depends_on:  "#8b5cf6",
  used_in:     "#ec4899",
};

export interface ContextGraphProps {
  nodes: ContextGraphNode[];
  edges: ContextGraphEdge[];
  highlightIds?: Set<string>;
  onNodeSelect: (nodeId: string | null, connectedIds: Set<string>) => void;
}

const CATEGORY_COLORS: Record<ContextGraphNode["category"], string> = {
  fact: "#3b82f6",
  preference: "#10b981",
  project: "#f59e0b",
  code: "#ec4899",
  decision: "#8b5cf6",
};

const SOURCE_COLORS: Record<ContextGraphNode["source"], string> = {
  chatgpt: "#10a37f",
  claude: "#d97706",
  gemini: "#4285f4",
  perplexity: "#8b5cf6",
};

const ContextGraph: React.FC<ContextGraphProps> = ({
  nodes,
  edges,
  highlightIds,
  onNodeSelect,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);

  const nodeMap = useMemo(() => {
    const map = new Map<string, ContextGraphNode>();
    for (const node of nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [nodes]);

  const activeIds = useMemo(() => {
    if (!selectedNodeId) return null;
    const ids = new Set<string>([selectedNodeId]);
    for (const edge of edges) {
      if (edge.from === selectedNodeId) ids.add(edge.to);
      if (edge.to === selectedNodeId) ids.add(edge.from);
    }
    return ids;
  }, [selectedNodeId, edges]);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
        onNodeSelect(null, new Set());
      } else {
        const connected = new Set<string>([nodeId]);
        for (const edge of edges) {
          if (edge.from === nodeId) connected.add(edge.to);
          if (edge.to === nodeId) connected.add(edge.from);
        }
        setSelectedNodeId(nodeId);
        onNodeSelect(nodeId, connected);
      }
    },
    [selectedNodeId, edges, onNodeSelect]
  );

  // highlight filter takes priority over selection dimming
  const getNodeOpacity = (nodeId: string): number => {
    if (highlightIds && highlightIds.size > 0)
      return highlightIds.has(nodeId) ? 1 : 0.15;
    if (!activeIds) return 1;
    return activeIds.has(nodeId) ? 1 : 0.2;
  };

  const getEdgeOpacity = (from: string, to: string): number => {
    if (highlightIds && highlightIds.size > 0)
      return highlightIds.has(from) || highlightIds.has(to) ? 0.6 : 0.05;
    if (!activeIds) return 1;
    return activeIds.has(from) && activeIds.has(to) ? 1 : 0.2;
  };

  return (
    <svg
      viewBox="0 0 700 460"
      style={{
        width: "100%",
        height: "100%",
        background: "#0a0a0f",
        display: "block",
      }}
    >
      {edges.map((edge, i) => {
        const fromNode = nodeMap.get(edge.from);
        const toNode = nodeMap.get(edge.to);
        if (!fromNode || !toNode) return null;
        const rel = edge.relationship ?? "related_to";
        const color = EDGE_COLORS[rel] ?? "#45455a";
        const strokeWidth = 1 + (edge.weight ?? 0.5) * 2;
        const mx = (fromNode.x + toNode.x) / 2;
        const my = (fromNode.y + toNode.y) / 2;
        const isHovered = hoveredEdge === i;
        return (
          <g key={`edge-${i}`}>
            <line
              x1={fromNode.x} y1={fromNode.y}
              x2={toNode.x}   y2={toNode.y}
              stroke={color}
              strokeWidth={isHovered ? strokeWidth + 1 : strokeWidth}
              strokeDasharray={rel === "contradicts" ? "5 3" : rel === "supersedes" ? "8 3" : undefined}
              style={{
                opacity: getEdgeOpacity(edge.from, edge.to),
                transition: "all 0.3s ease",
                cursor: "default",
              }}
              onMouseEnter={() => setHoveredEdge(i)}
              onMouseLeave={() => setHoveredEdge(null)}
            />
            {isHovered && (
              <text
                x={mx} y={my - 5}
                textAnchor="middle"
                style={{ fill: color, fontSize: "8px", fontFamily: "monospace", pointerEvents: "none" }}
              >
                {rel.replace("_", " ")}
              </text>
            )}
          </g>
        );
      })}

      {nodes.map((node) => {
        const r = 6 + node.confidence * 14;
        const fillColor = CATEGORY_COLORS[node.category];
        const ringColor = SOURCE_COLORS[node.source];
        const opacity = getNodeOpacity(node.id);

        return (
          <g
            key={node.id}
            style={{
              cursor: "pointer",
              opacity,
              transition: "all 0.3s ease",
            }}
            onClick={() => handleNodeClick(node.id)}
          >
            {highlightIds?.has(node.id) && (
              <circle cx={node.x} cy={node.y} r={r + 7} fill="none"
                stroke="#7c6aff" strokeWidth={1.5} opacity={0.6} />
            )}
            <circle cx={node.x} cy={node.y} r={r} fill={fillColor} />
            <circle
              cx={node.x}
              cy={node.y}
              r={r + 4}
              fill="none"
              stroke={ringColor}
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
            <text
              x={node.x}
              y={node.y}
              dy={r + 14}
              textAnchor="middle"
              style={{
                fill: "#e2e2e8",
                fontSize: "9px",
                fontFamily: "monospace",
              }}
            >
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default ContextGraph;
