import React from "react";
import type { ContextGraphNode } from "./ContextGraph";

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

export interface NodeDetailProps {
  node: ContextGraphNode;
  connectionCount: number;
  onRoute: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const NodeDetail: React.FC<NodeDetailProps> = ({
  node,
  connectionCount,
  onRoute,
  onEdit,
  onDelete,
}) => {
  const catColor = CATEGORY_COLORS[node.category];
  const srcColor = SOURCE_COLORS[node.source];
  const confidencePct = Math.round(node.confidence * 100);

  return (
    <div
      style={{
        padding: "14px 16px",
        borderTop: "1px solid #1e1e2e",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
      }}
    >
      {/* Left: node info */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
        <div
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: catColor,
            border: `2px solid ${srcColor}`,
            flexShrink: 0,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#e0e0e0",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {node.label}
          </span>
          <span
            style={{
              fontSize: "10px",
              color: "#555555",
              lineHeight: 1.3,
              marginTop: "1px",
            }}
          >
            {node.category}
            <span style={{ margin: "0 4px", color: "#333333" }}>/</span>
            {node.source}
            <span style={{ margin: "0 4px", color: "#333333" }}>&middot;</span>
            {connectionCount} connections
            <span style={{ margin: "0 4px", color: "#333333" }}>&middot;</span>
            {confidencePct}%
          </span>
        </div>
      </div>

      {/* Right: action buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        {([
          { label: "Route", onClick: onRoute, color: "#7c6aff" },
          { label: "Edit", onClick: onEdit, color: "#555555" },
          { label: "Del", onClick: onDelete, color: "#ef4444" },
        ] as const).map((btn) => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            style={{
              background: "none",
              border: `1px solid ${btn.color}40`,
              borderRadius: "4px",
              padding: "3px 8px",
              fontSize: "9px",
              color: btn.color,
              cursor: "pointer",
              letterSpacing: "0.3px",
              lineHeight: 1.2,
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default NodeDetail;
