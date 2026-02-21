import { McpUseProvider, useWidget, useCallTool, type WidgetMetadata } from "mcp-use/react";
import React, { useState, useCallback, useEffect, useRef } from "react";
import { z } from "zod";
import ContextGraph from "../components/ContextGraph";
import NodeDetail from "../components/NodeDetail";
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

// ─── Prop schema — flat union of all backend event shapes ─────

export const propSchema = z.object({
  event: z.string().default(""),
  node: backendNodeSchema.optional(),
  nodes: z.array(backendNodeSchema).optional(),
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

type MemoryPanelProps = z.infer<typeof propSchema>;

export const widgetMetadata: WidgetMetadata = {
  description: "Live context graph — memories visualized as nodes across ChatGPT, Claude, Gemini",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: false,
    invoking: "Updating memory graph...",
    invoked: "Memory graph updated",
  },
};

// ─── Type mapping helpers ─────────────────────────────────────

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

// ─── Edge builder ─────────────────────────────────────────────

function buildEdges(nodes: ContextGraphNode[]): ContextGraphEdge[] {
  if (nodes.length < 2) return [];
  const edges: ContextGraphEdge[] = [];
  const byCategory: Record<string, ContextGraphNode[]> = {};

  for (const node of nodes) {
    if (!byCategory[node.category]) byCategory[node.category] = [];
    byCategory[node.category].push(node);
  }

  // Sequential edges within same category
  for (const cat in byCategory) {
    const catNodes = byCategory[cat];
    for (let i = 0; i < catNodes.length - 1; i++) {
      edges.push({ from: catNodes[i].id, to: catNodes[i + 1].id });
    }
  }

  // Cross-category: connect first node of each adjacent category
  const categories = Object.keys(byCategory);
  for (let i = 0; i < categories.length - 1; i++) {
    edges.push({
      from: byCategory[categories[i]][0].id,
      to: byCategory[categories[i + 1]][0].id,
    });
  }

  return edges;
}

// ─── Sub-components ───────────────────────────────────────────

const Header: React.FC<{ confidencePercent: number; graphName?: string }> = ({
  confidencePercent,
  graphName,
}) => {
  const circumference = 2 * Math.PI * 14;
  const dashOffset = circumference - (confidencePercent / 100) * circumference;

  return (
    <div
      style={{
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid #1e1e2e",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "7px",
            background: "linear-gradient(135deg, #7c6aff, #ec4899)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontWeight: 800, fontSize: "14px", color: "#ffffff", lineHeight: 1 }}>
            S
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#e0e0e0",
              letterSpacing: "-0.3px",
              lineHeight: 1.2,
            }}
          >
            SwitchMemory
          </span>
          <span
            style={{
              fontSize: "10px",
              color: "#555555",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              marginTop: "1px",
              lineHeight: 1.2,
            }}
          >
            {graphName ?? "Universal Context Graph"}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <span
          style={{
            fontSize: "9px",
            color: "#555555",
            letterSpacing: "1px",
            textTransform: "uppercase",
            marginRight: "6px",
          }}
        >
          CTX
        </span>
        <svg width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="14" stroke="#1e1e2e" strokeWidth="3" fill="none" />
          <circle
            cx="18"
            cy="18"
            r="14"
            stroke="#7c6aff"
            strokeWidth="3"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "50% 50%",
              transition: "stroke-dashoffset 0.4s ease",
            }}
          />
          <text
            x="18"
            y="18"
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fontSize: "9px", fill: "#e0e0e0", fontWeight: 600 }}
          >
            {confidencePercent}%
          </text>
        </svg>
      </div>
    </div>
  );
};

const PLATFORMS = [
  { name: "ChatGPT", key: "chatgpt" as const, color: "#10a37f" },
  { name: "Claude",  key: "claude"  as const, color: "#d97706" },
  { name: "Gemini",  key: "gemini"  as const, color: "#4285f4" },
  { name: "Perplexity", key: "perplexity" as const, color: "#8b5cf6" },
];

const Footer: React.FC<{
  nodeCount: number;
  edgeCount: number;
  activeSources: Set<string>;
  readOnly: boolean;
}> = ({ nodeCount, edgeCount, activeSources, readOnly }) => (
  <div
    style={{
      padding: "10px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderTop: "1px solid #1e1e2e",
    }}
  >
    <span style={{ fontSize: "10px", color: "#444444", letterSpacing: "0.3px" }}>
      {nodeCount} nodes
      <span style={{ margin: "0 3px" }}>&middot;</span>
      {edgeCount} edges
      {readOnly && (
        <>
          <span style={{ margin: "0 3px" }}>&middot;</span>
          <span style={{ color: "#f59e0b" }}>read-only</span>
        </>
      )}
    </span>
    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
      {PLATFORMS.map((p) => (
        <div
          key={p.key}
          title={p.name}
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: activeSources.has(p.key) ? p.color : "#1e1e2e",
            border: `1px solid ${p.color}4d`,
            transition: "background 0.3s ease",
          }}
        />
      ))}
    </div>
  </div>
);

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
    <span style={{ fontSize: "12px", color: "#444444", fontFamily: "monospace" }}>
      No memories yet
    </span>
    <span style={{ fontSize: "10px", color: "#333333", fontFamily: "monospace" }}>
      Say something and I'll remember it
    </span>
  </div>
);

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

// ─── Main Widget ──────────────────────────────────────────────

const MemoryPanel: React.FC = () => {
  const { props, isPending } = useWidget<MemoryPanelProps>();

  const [nodes, setNodes] = useState<ContextGraphNode[]>([]);
  const [edges, setEdges] = useState<ContextGraphEdge[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [graphName, setGraphName] = useState<string | undefined>();
  const [readOnly, setReadOnly] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  // ── Handle backend events ──────────────────────────────────
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
          setEdges(buildEdges(repositioned));
          return repositioned;
        });
        break;
      }

      case "context_loaded": {
        if (!props.nodes) return;
        const graphNodes = backendNodesToGraph(props.nodes);
        setNodes(graphNodes);
        setEdges(buildEdges(graphNodes));
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
        setEdges(buildEdges(graphNodes));
        setSelectedNodeId(null);
        break;
      }

      case "node_deleted": {
        if (!props.nodeId) return;
        setNodes((prev) => {
          const updated = repositionNodes(prev.filter((n) => n.id !== props.nodeId));
          setEdges(buildEdges(updated));
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
        setEdges(buildEdges(graphNodes));
        setSelectedNodeId(null);
        setReadOnly(props.readOnly ?? false);
        setGraphName(props.graphName);
        break;
      }
    }
  }, [props]);

  // ── Tool wiring ────────────────────────────────────────────
  const { callTool: deleteTool } = useCallTool("delete-memory");
  const { callTool: shareTool } = useCallTool("share-graph");

  const handleDelete = useCallback(() => {
    if (!selectedNodeId || readOnly) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (deleteTool as any)({ node_id: selectedNodeId });
  }, [selectedNodeId, readOnly, deleteTool]);

  const handleShare = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (shareTool as any)({ scope: "global" });
  }, [shareTool]);

  const handleNodeSelect = useCallback(
    (nodeId: string | null, _connectedIds: Set<string>) => {
      setSelectedNodeId(nodeId);
    },
    []
  );

  // ── Derived values ─────────────────────────────────────────
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  const connectionCount = selectedNodeId
    ? edges.filter((e) => e.from === selectedNodeId || e.to === selectedNodeId).length
    : 0;

  const confidencePercent = Math.round(confidence * 100);

  const activeSources = new Set(nodes.map((n) => n.source));

  // ── Loading state ──────────────────────────────────────────
  if (isPending && nodes.length === 0) {
    return (
      <McpUseProvider>
        <div
          style={{
            background: "#0a0a0f",
            borderRadius: "12px",
            border: "1px solid #1e1e2e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "200px",
          }}
        >
          <span style={{ color: "#6b6b7b", fontFamily: "monospace", fontSize: "12px" }}>
            Loading context graph...
          </span>
        </div>
      </McpUseProvider>
    );
  }

  // ── Full render ────────────────────────────────────────────
  return (
    <McpUseProvider>
      <div
        style={{
          background: "#0a0a0f",
          borderRadius: "12px",
          border: "1px solid #1e1e2e",
          overflow: "hidden",
          position: "relative",
          fontFamily: "JetBrains Mono, SF Mono, Fira Code, monospace",
        }}
      >
        <Header confidencePercent={confidencePercent} graphName={graphName} />

        {nodes.length === 0 ? (
          <EmptyState />
        ) : (
          <ContextGraph
            nodes={nodes}
            edges={edges}
            onNodeSelect={handleNodeSelect}
          />
        )}

        {selectedNode && (
          <NodeDetail
            node={selectedNode}
            connectionCount={connectionCount}
            onRoute={() => showToast("Routing suggestion: use get-context tool")}
            onEdit={() => showToast("Update via chat: 'edit memory…'")}
            onDelete={handleDelete}
          />
        )}

        {!readOnly && nodes.length > 0 && (
          <div
            style={{
              padding: "8px 16px",
              borderTop: "1px solid #1e1e2e",
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
          activeSources={activeSources}
          readOnly={readOnly}
        />

        {toast && <Toast message={toast} />}
        {shareUrl && (
          <ShareOverlay url={shareUrl} onDismiss={() => setShareUrl(null)} />
        )}
      </div>
    </McpUseProvider>
  );
};

export default MemoryPanel;
