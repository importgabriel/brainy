import React from "react";

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
  const hasQuery = query.trim().length > 0;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "#12121a",
          border: "1px solid #1e1e2e",
          borderRadius: "10px",
          padding: "10px 12px",
          margin: "10px 16px",
        }}
      >
        {/* Magnifying glass */}
        <span
          style={{
            fontSize: "16px",
            color: "#6b7280",
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          ⌕
        </span>

        {/* Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => onChangeQuery(e.target.value)}
          placeholder="Search your memory graph… (e.g. 'AWS deploy', 'budgeting feature')"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#e5e7eb",
            fontSize: "13px",
            fontFamily: "inherit",
            padding: 0,
          }}
        />

        {/* Relevant pill */}
        {hasQuery && (
          <span
            style={{
              fontSize: "10px",
              color: "#9ca3af",
              background: "#1e1e2e",
              borderRadius: "6px",
              padding: "3px 8px",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {activeRelevantCount}/{relevantCount} relevant active
          </span>
        )}

        {/* Clear button */}
        {hasQuery && (
          <button
            onClick={onClear}
            style={{
              background: "none",
              border: "1px solid #1e1e2e",
              borderRadius: "8px",
              padding: "4px 10px",
              fontSize: "10px",
              color: "#6b7280",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Helper text below bar */}
      {hasQuery && relevantCount === 0 && (
        <div
          style={{
            padding: "4px 16px 2px",
            fontSize: "11px",
            color: "#6b7280",
          }}
        >
          No matching memories found
        </div>
      )}
      {hasQuery && relevantCount > 0 && (
        <div
          style={{
            padding: "4px 16px 2px",
            fontSize: "11px",
            color: "#6b7280",
          }}
        >
          Showing {relevantCount} matching memories — click nodes to activate
          context
        </div>
      )}
    </div>
  );
};

export default QueryBar;
