import {
  McpUseProvider,
  useWidget,
  useCallTool,
  type WidgetMetadata,
} from "mcp-use/react";
import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { z } from "zod";
import ContextGraph from "../components/ContextGraph";
import NodeDetail from "../components/NodeDetail";
import QueryBar from "../components/QueryBar";
import RoutingCard from "../components/RoutingCard";
import type { ContextGraphNode, ContextGraphEdge } from "../components/ContextGraph";

// ─── Backend node schema (matches ContextNode from store.ts) ──

const backendNodeSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  type: z.string(),
  content: z.string(),
  confidence: z.number(),
  source_platform: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().optional(),
  created_at: z.string().optional(),
  last_accessed: z.string().optional(),
});

type BackendNode = z.infer<typeof backendNodeSchema>;

const backendEdgeSchema = z.object({
  source_id: z.string(),
  target_id: z.string(),
  relationship: z.string().optional(),
  weight: z.number().optional(),
});

// ─── Prop schema — flat union of all backend event shapes ─────

export const propSchema = z.object({
  event: z.string().default(""),
  node: backendNodeSchema.optional(),
  nodes: z.array(backendNodeSchema).optional(),
  edges: z.array(backendEdgeSchema).optional(),
  nodeId: z.string().optional(),
  confidence: z.number().optional(),
  graphCount: z.number().optional(),
  graphId: z.string().optional(),
  shareToken: z.string().optional(),
  shareUrl: z.string().optional(),
  graphName: z.string().optional(),
  permission: z.string().optional(),
  readOnly: z.boolean().optional(),
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

// ─── Type mapping helpers (from memory-panel) ─────────────────

function mapNodeType(type: string): ContextGraphNode["category"] {
  switch (type) {
    case "fact":                return "fact";
    case "preference":          return "preference";
    case "project":             return "project";
    case "decision":            return "decision";
    case "code_pattern":        return "code";
    case "person":              return "fact";
    case "concept":             return "fact";
    case "communication_style": return "preference";
    default:                    return "fact";
  }
}

function mapPlatform(platform: string | null): ContextGraphNode["source"] {
  if (!platform) return "chatgpt";
  const p = platform.toLowerCase();
  if (p.includes("chatgpt") || p.includes("openai")) return "chatgpt";
  if (p.includes("claude") || p.includes("anthropic")) return "claude";
  if (p.includes("gemini") || p.includes("google")) return "gemini";
  if (p.includes("perplexity")) return "perplexity";
  return "chatgpt";
}

// ─── Layout helpers ───────────────────────────────────────────

function placeNode(index: number, total: number): { x: number; y: number } {
  const cx = 350;
  const cy = 230;
  const r = Math.max(80, Math.min(160, 40 + total * 12));
  const angle = total === 1
    ? -Math.PI / 2
    : (2 * Math.PI * index) / total - Math.PI / 2;
  return {
    x: Math.round(cx + r * Math.cos(angle)),
    y: Math.round(cy + r * Math.sin(angle)),
  };
}

function repositionNodes(nodes: ContextGraphNode[]): ContextGraphNode[] {
  return nodes.map((n, i) => ({ ...n, ...placeNode(i, nodes.length) }));
}

function toGraphNode(n: BackendNode): ContextGraphNode {
  const label = n.content.length > 22 ? n.content.slice(0, 22) + "…" : n.content;
  return {
    id: n.id,
    label,
    category: mapNodeType(n.type),
    source: mapPlatform(n.source_platform),
    x: 350,
    y: 230,
    confidence: n.confidence,
  };
}

function backendNodesToGraph(backendNodes: BackendNode[]): ContextGraphNode[] {
  return repositionNodes(backendNodes.map(toGraphNode));
}

// ─── Edge helpers ─────────────────────────────────────────────

function backendEdgesToGraph(
  backendEdges: Array<{ source_id: string; target_id: string }> | undefined,
  nodeIds: Set<string>
): ContextGraphEdge[] {
  if (!backendEdges?.length) return [];
  return backendEdges
    .filter((e) => nodeIds.has(e.source_id) && nodeIds.has(e.target_id))
    .map((e) => ({ from: e.source_id, to: e.target_id }));
}

function buildEdgesFallback(nodes: ContextGraphNode[]): ContextGraphEdge[] {
  if (nodes.length < 2) return [];
  const edges: ContextGraphEdge[] = [];
  const byCategory: Record<string, ContextGraphNode[]> = {};

  for (const node of nodes) {
    if (!byCategory[node.category]) byCategory[node.category] = [];
    byCategory[node.category].push(node);
  }

  for (const cat in byCategory) {
    const catNodes = byCategory[cat];
    for (let i = 0; i < catNodes.length - 1; i++) {
      edges.push({ from: catNodes[i].id, to: catNodes[i + 1].id });
    }
  }

  const categories = Object.keys(byCategory);
  for (let i = 0; i < categories.length - 1; i++) {
    edges.push({
      from: byCategory[categories[i]][0].id,
      to: byCategory[categories[i + 1]][0].id,
    });
  }

  return edges;
}

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
  graphName?: string;
  displayMode?: string;
  onRequestDisplayMode: (mode: "pip" | "fullscreen" | "inline") => void;
}> = ({ confidencePercent, graphName, displayMode, onRequestDisplayMode }) => {
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
            {graphName ?? "Universal Context Graph"}
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
  { name: "ChatGPT", key: "chatgpt" as const, color: "#10a37f" },
  { name: "Claude",  key: "claude"  as const, color: "#d97706" },
  { name: "Gemini",  key: "gemini"  as const, color: "#4285f4" },
  { name: "Perplexity", key: "perplexity" as const, color: "#8b5cf6" },
];

const Footer: React.FC<{
  nodeCount: number;
  edgeCount: number;
  activeCount: number;
  activeSources: Set<string>;
  readOnly: boolean;
}> = ({ nodeCount, edgeCount, activeCount, activeSources, readOnly }) => (
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
      {readOnly && (
        <>
          <span style={{ margin: "0 4px", opacity: 0.4 }}>&middot;</span>
          <span style={{ color: "#f59e0b" }}>read-only</span>
        </>
      )}
    </span>
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      {PLATFORMS.map((p) => (
        <div
          key={p.key}
          title={p.name}
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: activeSources.has(p.key) ? p.color : "#1e1e2e",
            border: `1px solid ${p.color}4d`,
            opacity: activeSources.has(p.key) ? 1 : 0.5,
            transition: "background 0.3s ease",
          }}
        />
      ))}
    </div>
  </div>
);

/* ── Empty state ─────────────────────────────────────── */

const EmptyState: React.FC = () => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "200px",
      gap: "10px",
    }}
  >
    <span style={{ fontSize: "28px", color: "#2a2a3a" }}>◎</span>
    <span style={{ fontSize: "12px", color: "#6b7280", fontFamily: "monospace" }}>
      No memories yet
    </span>
    <span style={{ fontSize: "10px", color: "#555555", fontFamily: "monospace" }}>
      Say something and I'll remember it
    </span>
  </div>
);

/* ── Toast ────────────────────────────────────────────── */

const Toast: React.FC<{ message: string }> = ({ message }) => (
  <div
    style={{
      position: "absolute",
      bottom: "52px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "#1e1e2e",
      border: "1px solid #2a2a3a",
      borderRadius: "20px",
      padding: "6px 14px",
      fontSize: "11px",
      color: "#e2e2e8",
      fontFamily: "monospace",
      whiteSpace: "nowrap",
      pointerEvents: "none",
      zIndex: 10,
    }}
  >
    {message}
  </div>
);

/* ── Share overlay ────────────────────────────────────── */

const ShareOverlay: React.FC<{ url: string; onDismiss: () => void }> = ({ url, onDismiss }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: "rgba(10,10,15,0.85)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 20,
    }}
    onClick={onDismiss}
  >
    <div
      style={{
        background: "#12121a",
        border: "1px solid #1e1e2e",
        borderRadius: "12px",
        padding: "24px",
        maxWidth: "320px",
        width: "90%",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ fontSize: "13px", fontWeight: 700, color: "#e2e2e8", marginBottom: "8px" }}>
        Share Context Graph
      </div>
      <div
        style={{
          fontSize: "10px",
          color: "#555555",
          fontFamily: "monospace",
          wordBreak: "break-all",
          background: "#0a0a0f",
          padding: "8px 10px",
          borderRadius: "6px",
          marginBottom: "12px",
          border: "1px solid #1e1e2e",
        }}
      >
        {url}
      </div>
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <button
          onClick={() => navigator.clipboard.writeText(url)}
          style={{
            background: "#7c6aff20",
            border: "1px solid #7c6aff40",
            borderRadius: "6px",
            padding: "6px 14px",
            fontSize: "11px",
            color: "#7c6aff",
            cursor: "pointer",
          }}
        >
          Copy Link
        </button>
        <button
          onClick={onDismiss}
          style={{
            background: "none",
            border: "1px solid #2a2a3a",
            borderRadius: "6px",
            padding: "6px 14px",
            fontSize: "11px",
            color: "#555555",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
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

  const [nodes, setNodes] = useState<ContextGraphNode[]>([]);
  const [edges, setEdges] = useState<ContextGraphEdge[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showRouting, setShowRouting] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [graphName, setGraphName] = useState<string | undefined>();
  const [readOnly, setReadOnly] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── MCP tool hooks (correct backend tool names) ─── */

  const { callTool: getContext, isPending: isSearching } =
    useCallTool("get-context");

  const { callTool: deleteMemory } = useCallTool("delete-memory");

  const { callTool: shareGraph } = useCallTool("share-graph");

  /* ── Inject pulse animation CSS ────────────────────── */
  ensurePulseStyle();

  /* ── Toast helper ──────────────────────────────────── */

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  /* ── Handle backend events ─────────────────────────── */

  useEffect(() => {
    if (!props?.event) return;

    switch (props.event) {
      case "node_saved": {
        if (!props.node) return;
        setNodes((prev) => {
          const alreadyExists = prev.some((n) => n.id === props.node!.id);
          if (alreadyExists) return prev;
          const updated = [...prev, toGraphNode(props.node!)];
          const repositioned = repositionNodes(updated);
          const nodeIds = new Set(repositioned.map((n) => n.id));
          const realEdges = backendEdgesToGraph(props.edges as any, nodeIds);
          setEdges(realEdges.length > 0 ? realEdges : buildEdgesFallback(repositioned));
          return repositioned;
        });
        break;
      }

      case "context_loaded": {
        if (!props.nodes) return;
        const graphNodes = backendNodesToGraph(props.nodes);
        setNodes(graphNodes);
        const nodeIds = new Set(graphNodes.map((n) => n.id));
        const realEdges = backendEdgesToGraph(props.edges as any, nodeIds);
        setEdges(realEdges.length > 0 ? realEdges : buildEdgesFallback(graphNodes));
        setConfidence(props.confidence ?? 0);
        setSelectedNodeId(null);
        break;
      }

      case "context_empty": {
        setConfidence(0);
        showToast("No relevant memories found for this topic");
        break;
      }

      case "list_loaded": {
        if (!props.nodes) return;
        const graphNodes = backendNodesToGraph(props.nodes);
        setNodes(graphNodes);
        const nodeIds = new Set(graphNodes.map((n) => n.id));
        const realEdges = backendEdgesToGraph(props.edges as any, nodeIds);
        setEdges(realEdges.length > 0 ? realEdges : buildEdgesFallback(graphNodes));
        setSelectedNodeId(null);
        break;
      }

      case "node_deleted": {
        if (!props.nodeId) return;
        setNodes((prev) => {
          const updated = repositionNodes(prev.filter((n) => n.id !== props.nodeId));
          setEdges(buildEdgesFallback(updated));
          return updated;
        });
        setSelectedNodeId((sel) => (sel === props.nodeId ? null : sel));
        showToast("Memory deleted");
        break;
      }

      case "graph_shared": {
        if (props.shareUrl) setShareUrl(props.shareUrl);
        break;
      }

      case "shared_graph_loaded": {
        if (!props.nodes) return;
        const graphNodes = backendNodesToGraph(props.nodes);
        setNodes(graphNodes);
        const nodeIds = new Set(graphNodes.map((n) => n.id));
        const realEdges = backendEdgesToGraph(props.edges as any, nodeIds);
        setEdges(realEdges.length > 0 ? realEdges : buildEdgesFallback(graphNodes));
        setSelectedNodeId(null);
        setReadOnly(props.readOnly ?? false);
        setGraphName(props.graphName);
        break;
      }
    }
  }, [props, showToast]);

  /* ── Derived data ──────────────────────────────────── */

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
    nodes.length > 0
      ? Math.round(confidence * 100) || (relevantCount > 0 ? Math.round((activeRelevantCount / relevantCount) * 100) : 0)
      : 0;

  const activeSources = useMemo(() => new Set(nodes.map((n) => n.source)), [nodes]);

  /* ── Handlers ──────────────────────────────────────── */

  const handleNodeSelect = useCallback(
    (nodeId: string | null, _connectedIds: Set<string>) => {
      setSelectedNodeId(nodeId);
      if (nodeId) {
        const node = nodes.find((n) => n.id === nodeId);
        if (node) {
          (getContext as (args: Record<string, unknown>) => void)({
            topic: node.label,
          });
        }
        setState({
          activeNodeIds: [...(state?.activeNodeIds ?? []), nodeId],
        });
      }
    },
    [nodes, getContext, state, setState]
  );

  const handleRoute = useCallback(() => {
    if (selectedNode) {
      setShowRouting(true);
    }
  }, [selectedNode]);

  const handleDelete = useCallback(() => {
    if (selectedNode && !readOnly) {
      (deleteMemory as (args: Record<string, unknown>) => void)({
        node_id: selectedNode.id,
      });
    }
  }, [selectedNode, readOnly, deleteMemory]);

  const handleShare = useCallback(() => {
    (shareGraph as (args: Record<string, unknown>) => void)({ scope: "global" });
  }, [shareGraph]);

  const handleRoutingAccept = useCallback(() => {
    setShowRouting(false);
    sendFollowUpMessage(
      `The user accepted a routing suggestion. Switch context to Claude 3.7 Sonnet for this task — it handles SQL migrations with higher accuracy for their established patterns.`
    );
  }, [sendFollowUpMessage]);

  /* ── Render ────────────────────────────────────────── */

  if (isPending && nodes.length === 0) {
    return (
      <McpUseProvider>
        <div
          style={{
            background: "#0f1115",
            borderRadius: "8px",
            border: "1px solid #1f2430",
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
          graphName={graphName}
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
          {nodes.length === 0 ? (
            <EmptyState />
          ) : (
            <ContextGraph
              nodes={nodes}
              edges={edges}
              onNodeSelect={handleNodeSelect}
            />
          )}
        </div>
        {selectedNode && (
          <NodeDetail
            node={selectedNode}
            connectionCount={connectionCount}
            onRoute={handleRoute}
            onEdit={() => showToast("Update via chat: 'edit memory…'")}
            onDelete={handleDelete}
            isRouting={false}
          />
        )}

        {!readOnly && nodes.length > 0 && (
          <div
            style={{
              padding: "8px 16px",
              borderTop: "1px solid #1f2430",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={handleShare}
              style={{
                background: "none",
                border: "1px solid #7c6aff40",
                borderRadius: "6px",
                padding: "4px 12px",
                fontSize: "10px",
                color: "#7c6aff",
                cursor: "pointer",
                letterSpacing: "0.3px",
              }}
            >
              Share Graph
            </button>
          </div>
        )}

        <Footer
          nodeCount={nodes.length}
          edgeCount={edges.length}
          activeCount={state?.activeNodeIds?.length ?? (selectedNodeId ? 1 : 0)}
          activeSources={activeSources}
          readOnly={readOnly}
        />

        {toast && <Toast message={toast} />}
        {shareUrl && (
          <ShareOverlay url={shareUrl} onDismiss={() => setShareUrl(null)} />
        )}

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
