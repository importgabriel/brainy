import React, { useState } from "react";

export interface QueryBarProps {
  query: string;
  onChangeQuery: (q: string) => void;
  relevantCount: number;
  activeRelevantCount: number;
  onClear: () => void;
}

const QueryBar: React.FC<QueryBarProps> = ({
  query,
  onChangeQuery,
  relevantCount,
  activeRelevantCount,
  onClear,
}) => {
  const [focused, setFocused] = useState(false);
  const hasQuery = query.trim().length > 0;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "#151922",
          border: `1px solid ${focused ? "#5b6cff" : "#1f2430"}`,
          borderRadius: "8px",
          padding: "9px 12px",
          margin: "8px 12px",
          transition: "border-color 0.15s ease",
        }}
      >
        {/* Search icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6b7280"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        {/* Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => onChangeQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search your memory graph…"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#e6eaf2",
            fontSize: "13px",
            fontFamily: "inherit",
            padding: 0,
          }}
        />

        {/* Status text */}
        {hasQuery && (
          <span
            style={{
              fontSize: "11px",
              color: "#6b7280",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {relevantCount} relevant &middot; {activeRelevantCount} active
          </span>
        )}

        {/* Clear button */}
        {hasQuery && (
          <button
            onClick={onClear}
            style={{
              background: "none",
              border: "1px solid #1f2430",
              borderRadius: "6px",
              padding: "3px 8px",
              fontSize: "11px",
              color: "#9aa3b2",
              cursor: "pointer",
              flexShrink: 0,
              lineHeight: 1.2,
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Helper text */}
      {hasQuery && relevantCount === 0 && (
        <div
          style={{
            padding: "2px 16px 4px",
            fontSize: "11px",
            color: "#6b7280",
          }}
        >
          No matching memories found
        </div>
      )}
    </div>
  );
};

export default QueryBar;
