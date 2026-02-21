import {
  McpUseProvider,
  useWidget,
  useCallTool,
  type WidgetMetadata,
} from "mcp-use/react";
import React, { useState, useCallback, useMemo } from "react";
import { z } from "zod";
import ContextGraph from "../components/ContextGraph";
import NodeDetail from "../components/NodeDetail";
import QueryBar from "../components/QueryBar";
import RoutingCard from "../components/RoutingCard";
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

type WidgetState = { activeNodeIds: string[] };

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

const noop = () => {};

/* ── Display mode button ────────────────────────────── */

const displayModeButtonStyle: React.CSSProperties = {
  width: "20px",
  height: "20px",
  border: "1px solid #1e1e2e",
  borderRadius: "4px",
  background: "transparent",
  color: "#6b6b7b",
  fontSize: "12px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  lineHeight: 1,
};

/* ── Header ──────────────────────────────────────────── */

const Header: React.FC<{
  confidencePercent: number;
  displayMode?: string;
  onRequestDisplayMode: (mode: "pip" | "fullscreen" | "inline") => void;
}> = ({ confidencePercent, displayMode, onRequestDisplayMode }) => {
  const isExpanded = displayMode === "pip" || displayMode === "fullscreen";

  return (
    <div
      style={{
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid #1f2430",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: "26px",
            height: "26px",
            borderRadius: "6px",
            background: "rgba(91, 108, 255, 0.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: "13px",
              color: "#5b6cff",
              lineHeight: 1,
            }}
          >
            S
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#e6eaf2",
              letterSpacing: "-0.2px",
              lineHeight: 1.2,
            }}
          >
            SwitchMemory
          </span>
          <span
            style={{
              fontSize: "10px",
              color: "#6b7280",
              letterSpacing: "0.3px",
              marginTop: "1px",
              lineHeight: 1.2,
            }}
          >
            Universal Context Graph
          </span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {/* Display mode buttons */}
        {isExpanded ? (
          <button
            onClick={() => onRequestDisplayMode("inline")}
            style={displayModeButtonStyle}
            title="Exit"
          >
            ✕
          </button>
        ) : (
          <>
            <button
              onClick={() => onRequestDisplayMode("pip")}
              style={displayModeButtonStyle}
              title="Picture-in-picture"
            >
              ⊡
            </button>
            <button
              onClick={() => onRequestDisplayMode("fullscreen")}
              style={displayModeButtonStyle}
              title="Fullscreen"
            >
              ⛶
            </button>
          </>
        )}
        {/* CTX meter */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            border: "1px solid #1f2430",
            borderRadius: "6px",
            padding: "4px 10px",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              color: "#6b7280",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            CTX
          </span>
          <span
            style={{
              fontSize: "11px",
              color: "#5b6cff",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {confidencePercent}%
          </span>
        </div>
      </div>
    </div>
  );
};

/* ── Footer ──────────────────────────────────────────── */

const PLATFORMS = [
  { name: "ChatGPT", color: "#10a37f" },
  { name: "Claude", color: "#d97706" },
  { name: "Gemini", color: "#4285f4" },
  { name: "Perplexity", color: "#8b5cf6" },
] as const;

const Footer: React.FC<{
  nodeCount: number;
  edgeCount: number;
  activeCount: number;
}> = ({ nodeCount, edgeCount, activeCount }) => (
  <div
    style={{
      padding: "10px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderTop: "1px solid #1f2430",
    }}
  >
    <span style={{ fontSize: "11px", color: "#6b7280", letterSpacing: "0.2px" }}>
      {nodeCount} nodes
      <span style={{ margin: "0 4px", opacity: 0.4 }}>&middot;</span>
      {edgeCount} edges
      <span style={{ margin: "0 4px", opacity: 0.4 }}>&middot;</span>
      {activeCount} active
    </span>
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      {PLATFORMS.map((p) => (
        <div
          key={p.name}
          title={p.name}
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: p.color,
            opacity: 0.5,
          }}
        />
      ))}
    </div>
  </div>
);

/* ── Pulsing border keyframes (injected once) ────────── */

const PULSE_STYLE_ID = "ctx-graph-pulse-style";

function ensurePulseStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(PULSE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = PULSE_STYLE_ID;
  style.textContent = `
    @keyframes ctx-graph-border-pulse {
      0%, 100% { border-color: #7c6aff; }
      50% { border-color: transparent; }
    }
  `;
  document.head.appendChild(style);
}

/* ── Widget ──────────────────────────────────────────── */

const ContextGraphWidget: React.FC = () => {
  const {
    props,
    isPending,
    sendFollowUpMessage,
    state,
    setState,
    requestDisplayMode,
    displayMode,
  } = useWidget<ContextGraphWidgetProps, WidgetState>();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showRouting, setShowRouting] = useState(false);

  /* ── MCP tool hooks ────────────────────────────────── */

  const { callTool: searchMemories, isPending: isSearching } =
    useCallTool("search_memories");

  const { callTool: getRouting, isPending: isRouting } =
    useCallTool("get_routing_suggestion");

  const { callTool: deleteMemory } = useCallTool("delete_memory");

  const { callTool: logFeedback } = useCallTool("log_feedback");

  const { callTool: saveMemory } = useCallTool("save_memory");

  /* ── Inject pulse animation CSS ────────────────────── */
  ensurePulseStyle();

  /* ── Derived data ──────────────────────────────────── */

  const nodes = isPending ? [] : (props.nodes as ContextGraphNode[]);
  const edges = isPending ? [] : (props.edges as ContextGraphEdge[]);

  const relevantNodeIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return new Set<string>();
    return new Set(
      nodes
        .filter((n) => {
          const label = (n.label || "").toLowerCase();
          const category = (n.category || "").toLowerCase();
          const source = (n.source || "").toLowerCase();
          return label.includes(q) || category.includes(q) || source.includes(q);
        })
        .map((n) => n.id)
    );
  }, [query, nodes]);

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null),
    [selectedNodeId, nodes]
  );

  const connectionCount = useMemo(() => {
    if (!selectedNodeId) return 0;
    return edges.filter((e) => e.from === selectedNodeId || e.to === selectedNodeId).length;
  }, [selectedNodeId, edges]);

  const relevantCount = relevantNodeIds.size;
  const activeRelevantCount =
    selectedNodeId && relevantNodeIds.has(selectedNodeId) ? 1 : 0;
  const confidencePercent =
    relevantCount > 0
      ? Math.round((activeRelevantCount / relevantCount) * 100)
      : 0;

  /* ── Handlers ──────────────────────────────────────── */

  const handleNodeSelect = useCallback(
    (nodeId: string | null, _connectedIds: Set<string>) => {
      setSelectedNodeId(nodeId);
      if (nodeId) {
        const node = (props.nodes as ContextGraphNode[]).find((n) => n.id === nodeId);
        if (node) {
          (searchMemories as (args: Record<string, unknown>) => void)({
            query: node.label,
            top_k: 5,
          });
        }
        setState({
          activeNodeIds: [...(state?.activeNodeIds ?? []), nodeId],
        });
      }
    },
    [props.nodes, searchMemories, state, setState]
  );

  const handleRoute = useCallback(() => {
    if (selectedNode) {
      (getRouting as (args: Record<string, unknown>, opts?: Record<string, unknown>) => void)(
        { prompt: selectedNode.label, task_type: selectedNode.category },
        { onSuccess: () => setShowRouting(true) }
      );
    }
  }, [selectedNode, getRouting]);

  const handleDelete = useCallback(() => {
    if (selectedNode) {
      (deleteMemory as (args: Record<string, unknown>) => void)({
        memory_id: selectedNode.id,
      });
    }
  }, [selectedNode, deleteMemory]);

  const handleRoutingAccept = useCallback(() => {
    setShowRouting(false);
    sendFollowUpMessage(
      `The user accepted a routing suggestion. Switch context to Claude 3.7 Sonnet for this task — it handles SQL migrations with higher accuracy for their established patterns.`
    );
  }, [sendFollowUpMessage]);

  /* ── Render ────────────────────────────────────────── */

  if (isPending) {
    return (
      <McpUseProvider>
        <div
          style={{
            background: "#0f1115",
            padding: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "200px",
          }}
        >
          <span style={{ color: "#6b7280", fontSize: "12px" }}>
            Loading context graph...
          </span>
        </div>
      </McpUseProvider>
    );
  }

  return (
    <McpUseProvider>
      <div
        style={{
          background: "#0f1115",
          borderRadius: "8px",
          border: "1px solid #1f2430",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Header
          confidencePercent={confidencePercent}
          displayMode={displayMode}
          onRequestDisplayMode={requestDisplayMode}
        />
        <QueryBar
          query={query}
          onChangeQuery={setQuery}
          relevantCount={relevantCount}
          activeRelevantCount={activeRelevantCount}
          onClear={() => setQuery("")}
        />
        {/* Graph area — pulsing border when searching */}
        <div
          style={
            isSearching
              ? {
                  border: "1px solid #7c6aff",
                  animation: "ctx-graph-border-pulse 1.5s ease-in-out infinite",
                }
              : undefined
          }
        >
          <ContextGraph
            nodes={nodes}
            edges={edges}
            onNodeSelect={handleNodeSelect}
          />
        </div>
        {selectedNode && (
          <NodeDetail
            node={selectedNode}
            connectionCount={connectionCount}
            onRoute={handleRoute}
            onEdit={noop}
            onDelete={handleDelete}
            isRouting={isRouting}
          />
        )}
        <Footer
          nodeCount={nodes.length}
          edgeCount={edges.length}
          activeCount={state?.activeNodeIds?.length ?? (selectedNodeId ? 1 : 0)}
        />
        {showRouting && (
          <RoutingCard
            recommended={{
              platform: "Claude 3.7 Sonnet",
              color: "#d97706",
              reason:
                "handles SQL migrations with 40% higher accuracy for your established patterns.",
              nodeCount: nodes.filter((n) => n.category === "code").length || 3,
            }}
            onAccept={handleRoutingAccept}
            onDismiss={() => setShowRouting(false)}
          />
        )}
      </div>
    </McpUseProvider>
  );
};

export default ContextGraphWidget;
