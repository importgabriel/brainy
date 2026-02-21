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
        padding: "12px 16px",
        borderTop: "1px solid #1f2430",
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
            width: "8px",
            height: "8px",
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
              color: "#e6eaf2",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {node.label}
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginTop: "3px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                color: "#9aa3b2",
                background: "#1f2430",
                borderRadius: "4px",
                padding: "1px 6px",
                textTransform: "uppercase",
                letterSpacing: "0.3px",
              }}
            >
              {node.category}
            </span>
            <span
              style={{
                fontSize: "10px",
                color: "#9aa3b2",
                background: "#1f2430",
                borderRadius: "4px",
                padding: "1px 6px",
                textTransform: "uppercase",
                letterSpacing: "0.3px",
              }}
            >
              {node.source}
            </span>
            <span style={{ fontSize: "10px", color: "#6b7280" }}>
              {connectionCount} conn
            </span>
            <span style={{ fontSize: "10px", color: "#6b7280" }}>
              Confidence {confidencePct}%
            </span>
          </div>
        </div>
      </div>

      {/* Right: action buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        <button
          onClick={onRoute}
          style={{
            background: "none",
            border: "1px solid rgba(91, 108, 255, 0.3)",
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "11px",
            color: "#5b6cff",
            cursor: "pointer",
            lineHeight: 1.2,
          }}
        >
          Route
        </button>
        <button
          onClick={onEdit}
          style={{
            background: "none",
            border: "1px solid #1f2430",
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "11px",
            color: "#9aa3b2",
            cursor: "pointer",
            lineHeight: 1.2,
          }}
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          style={{
            background: "none",
            border: "none",
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "11px",
            color: "#ef4444",
            cursor: "pointer",
            lineHeight: 1.2,
            opacity: 0.7,
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default NodeDetail;
