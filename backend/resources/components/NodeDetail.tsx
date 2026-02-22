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
  onInject?: () => void;
  isRouting?: boolean;
}

const NodeDetail: React.FC<NodeDetailProps> = ({
  node,
  connectionCount,
  onRoute,
  onEdit,
  onDelete,
  onInject,
  isRouting = false,
}) => {
  const catColor = CATEGORY_COLORS[node.category];
  const srcColor = SOURCE_COLORS[node.source];
  const confidencePct = Math.round(node.confidence * 100);

  return (
    <div
      style={{
        borderTop: "1px solid #1f2430",
      }}
    >
      {/* Header: node label + meta badges */}
      <div style={{ padding: "12px 16px 8px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
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
          <span
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "#e6eaf2",
              lineHeight: 1.3,
            }}
          >
            {node.label}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingLeft: "20px" }}>
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
            {confidencePct}%
          </span>
        </div>
      </div>

      {/* Full content — always visible, no toggle needed */}
      {node.fullContent && (
        <div style={{ padding: "0 16px 10px 16px" }}>
          <div
            style={{
              background: "#0a0a0f",
              border: "1px solid #1f2430",
              borderRadius: "6px",
              padding: "10px 12px",
              fontSize: "12px",
              color: "#c4c8d4",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: "150px",
              overflowY: "auto",
            }}
          >
            {node.fullContent}
          </div>
        </div>
      )}

      {/* Primary CTA: Inject into Chat — large, full-width, unmissable */}
      {onInject && (
        <div style={{ padding: "0 16px 10px 16px" }}>
          <button
            onClick={onInject}
            style={{
              width: "100%",
              background: "#5b6cff",
              border: "none",
              borderRadius: "8px",
              padding: "10px 16px",
              fontSize: "13px",
              fontWeight: 700,
              color: "#fff",
              cursor: "pointer",
              letterSpacing: "0.2px",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#4f5fe6")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#5b6cff")}
          >
            Inject into Chat
          </button>
        </div>
      )}

      {/* Secondary actions row */}
      <div
        style={{
          padding: "0 16px 10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "6px",
        }}
      >
        {isRouting ? (
          <span style={{ fontSize: "11px", color: "#7c6aff", padding: "4px 10px" }}>
            Analyzing...
          </span>
        ) : (
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
        )}
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
