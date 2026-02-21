import React from "react";

export interface RoutingRecommendation {
  platform: string;
  color: string;
  reason: string;
  nodeCount: number;
}

export interface RoutingCardProps {
  recommended: RoutingRecommendation;
  onAccept: () => void;
  onDismiss: () => void;
}

const RoutingCard: React.FC<RoutingCardProps> = ({
  recommended,
  onAccept,
  onDismiss,
}) => {
  const { platform, color, reason, nodeCount } = recommended;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      {/* Gradient fade */}
      <div
        style={{
          height: "40px",
          background: "linear-gradient(to bottom, transparent, #0a0a0f)",
        }}
      />

      {/* Card */}
      <div
        style={{
          background: "#0a0a0f",
          padding: "0 12px 12px",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            background: "#12121a",
            border: `1px solid ${color}40`,
            borderRadius: "12px",
            padding: "16px",
            boxShadow: `0 0 30px ${color}15`,
          }}
        >
          {/* Top row: dot + title + close */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: color,
                  boxShadow: `0 0 6px ${color}80`,
                  animation: "pulse 2s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#e6eaf2",
                  letterSpacing: "-0.1px",
                }}
              >
                Routing Suggestion
              </span>
            </div>
            <button
              onClick={onDismiss}
              style={{
                background: "none",
                border: "none",
                color: "#6b7280",
                fontSize: "14px",
                cursor: "pointer",
                padding: "0 2px",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* Body text */}
          <p
            style={{
              fontSize: "12px",
              color: "#6b6b7b",
              lineHeight: 1.5,
              margin: "0 0 14px",
            }}
          >
            Based on{" "}
            <span style={{ color: "#e6eaf2", fontWeight: 600 }}>
              {nodeCount} code-related nodes
            </span>{" "}
            in your active context,{" "}
            <span style={{ color: "#e6eaf2", fontWeight: 600 }}>
              {platform}
            </span>{" "}
            {reason}
          </p>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={onAccept}
              style={{
                flex: 1,
                background: color,
                border: "none",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#ffffff",
                cursor: "pointer",
                lineHeight: 1.2,
              }}
            >
              Switch to {platform} →
            </button>
            <button
              onClick={onDismiss}
              style={{
                flex: 1,
                background: "none",
                border: "1px solid #1f2430",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#9aa3b2",
                cursor: "pointer",
                lineHeight: 1.2,
              }}
            >
              Stay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoutingCard;
