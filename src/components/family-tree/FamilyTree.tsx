"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type Ref,
} from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type {
  FamilyMember,
  FamilyTreeData,
  PlaceholderUpdatePayload,
} from "@/types/genealogy";
import { memberGeneration } from "@/types/genealogy";
import {
  buildFlowGraph,
  type FamilyFlowEdge,
  type FamilyFlowNode,
} from "@/lib/genealogy/build-flow";
import { traceRoute as resolveTraceRoute } from "@/lib/genealogy/highlight-path";
import { MemberNode } from "./nodes/MemberNode";
import { PlaceholderNode } from "./nodes/PlaceholderNode";
import { RelationshipEdge } from "./edges/RelationshipEdge";
import { SmartSearch } from "./SmartSearch";
import "./family-tree.css";

function subscribeMobile(onStoreChange: () => void): () => void {
  const mq = window.matchMedia("(max-width: 768px)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getMobileSnapshot(): boolean {
  return window.matchMedia("(max-width: 768px)").matches;
}

function getServerMobileSnapshot(): boolean {
  return false;
}

function useIsMobileViewport(): boolean {
  return useSyncExternalStore(
    subscribeMobile,
    getMobileSnapshot,
    getServerMobileSnapshot,
  );
}

const nodeTypes = {
  member: MemberNode,
  placeholder: PlaceholderNode,
} satisfies NodeTypes;

const edgeTypes = {
  relationship: RelationshipEdge,
} satisfies EdgeTypes;

export type FamilyTreeHandle = {
  /**
   * Trace Route: trích `path`, mờ node/edge ngoài path (opacity 0.2),
   * tô sáng path, fitView/setCenter tới target.
   */
  traceRoute: (targetId: string) => void;
  /** @deprecated dùng `traceRoute` */
  highlightPath: (targetId: string) => void;
  clearHighlight: () => void;
  fitView: () => void;
  /** Zoom/Pan tới node (Smart Search) */
  focusMember: (targetId: string) => void;
};

export type FamilyTreeProps = {
  data: FamilyTreeData;
  className?: string;
  /** Gọi khi người dùng cập nhật placeholder từ form */
  onPlaceholderUpdate?: (payload: PlaceholderUpdatePayload) => void;
  /** Double-click node → mở hồ sơ (ProfileModal) */
  onMemberDoubleClick?: (memberId: string) => void;
  /** Highlight sẵn khi mount (tuỳ chọn) */
  initialHighlightId?: string | null;
  showToolbar?: boolean;
  showMiniMap?: boolean;
  showControls?: boolean;
  showBackground?: boolean;
  /** Tắt pan/zoom/drag — dùng khi xuất PDF */
  interactive?: boolean;
  /**
   * Chế độ khách (public tree): ẩn Thêm/Sửa/Xóa & form placeholder.
   * Vẫn cho phép pan/zoom/minimap và xem hồ sơ (double-click).
   */
  readOnly?: boolean;
};

function applyHighlight(
  nodes: FamilyFlowNode[],
  edges: FamilyFlowEdge[],
  members: FamilyMember[],
  relations: FamilyTreeData["relations"],
  targetId: string | null,
): { nodes: FamilyFlowNode[]; edges: FamilyFlowEdge[] } {
  if (!targetId) {
    return {
      nodes: nodes.map((n) => ({
        ...n,
        data: { ...n.data, dimmed: false, highlighted: false },
      })),
      edges: edges.map((e) => ({
        ...e,
        animated: e.data?.relationshipType === "ADOPTED",
        data: { ...e.data!, dimmed: false, highlighted: false },
      })),
    };
  }

  const route = resolveTraceRoute(targetId, members, relations);

  return {
    nodes: nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        dimmed: route.isNodeDimmed(n.id),
        highlighted: route.isNodeHighlighted(n.id),
      },
    })),
    edges: edges.map((e) => {
      const highlighted = route.isEdgeHighlighted(e.id);
      return {
        ...e,
        animated: e.data?.relationshipType === "ADOPTED" || highlighted,
        data: {
          ...e.data!,
          dimmed: route.isEdgeDimmed(e.id),
          highlighted,
        },
      };
    }),
  };
}

function attachPlaceholderHandler(
  nodes: FamilyFlowNode[],
  onOpenUpdate: ((memberId: string) => void) | undefined,
  readOnly: boolean,
): FamilyFlowNode[] {
  return nodes.map((node) => {
    if (node.type !== "placeholder") return node;
    return {
      ...node,
      data: {
        ...node.data,
        readOnly,
        onOpenUpdate: readOnly ? undefined : onOpenUpdate,
      },
    };
  });
}

type InnerProps = FamilyTreeProps & {
  treeRef: Ref<FamilyTreeHandle>;
};

function FamilyTreeInner({
  data,
  className,
  onPlaceholderUpdate,
  onMemberDoubleClick,
  initialHighlightId = null,
  showToolbar = true,
  showMiniMap = true,
  showControls = true,
  showBackground = true,
  interactive = true,
  readOnly = false,
  treeRef,
}: InnerProps) {
  const { fitView, setCenter, getNode } = useReactFlow();
  const isMobile = useIsMobileViewport();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(
    initialHighlightId,
  );

  const fitViewOptions = useMemo(
    () => ({
      padding: isMobile ? 0.35 : 0.2,
      maxZoom: isMobile ? 0.85 : 1.2,
      duration: isMobile ? 0 : 200,
    }),
    [isMobile],
  );

  const openUpdate = useCallback((memberId: string) => {
    if (readOnly) return;
    setEditingId(memberId);
  }, [readOnly]);

  const baseGraph = useMemo(() => buildFlowGraph(data), [data]);

  const seeded = useMemo(() => {
    const withHandlers = attachPlaceholderHandler(
      baseGraph.nodes,
      openUpdate,
      readOnly,
    );
    return applyHighlight(
      withHandlers,
      baseGraph.edges,
      data.members,
      data.relations,
      highlightId,
    );
  }, [baseGraph, data.members, data.relations, highlightId, openUpdate, readOnly]);

  const [nodes, setNodes, onNodesChange] = useNodesState(seeded.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(seeded.edges);

  useEffect(() => {
    setNodes(seeded.nodes);
    setEdges(seeded.edges);
  }, [seeded, setNodes, setEdges]);

  const centerOnTarget = useCallback(
    (targetId: string, zoom = 1.15) => {
      const node = getNode(targetId);
      if (!node) return;
      const width = node.measured?.width ?? 180;
      const height = node.measured?.height ?? 80;
      setCenter(node.position.x + width / 2, node.position.y + height / 2, {
        zoom: isMobile ? Math.min(zoom, 1.05) : zoom,
        duration: 480,
      });
    },
    [getNode, setCenter, isMobile],
  );

  const focusMember = useCallback(
    (targetId: string) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => centerOnTarget(targetId, 1.25));
      });
    },
    [centerOnTarget],
  );

  const traceRoute = useCallback(
    (targetId: string) => {
      setHighlightId(targetId);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const node = getNode(targetId);
          if (node) {
            centerOnTarget(targetId);
          } else {
            void fitView({ ...fitViewOptions, duration: 400 });
          }
        });
      });
    },
    [centerOnTarget, fitView, fitViewOptions, getNode],
  );

  const clearHighlight = useCallback(() => {
    setHighlightId(null);
    void fitView({ ...fitViewOptions, duration: 400 });
  }, [fitView, fitViewOptions]);

  useImperativeHandle(
    treeRef,
    () => ({
      traceRoute,
      highlightPath: traceRoute,
      clearHighlight,
      focusMember,
      fitView: () => {
        void fitView({ ...fitViewOptions, duration: 400 });
      },
    }),
    [traceRoute, clearHighlight, focusMember, fitView, fitViewOptions],
  );

  /** Mobile: khởi động Fit View vừa màn hình */
  useEffect(() => {
    if (!isMobile) return;
    const t = window.setTimeout(() => {
      void fitView({ ...fitViewOptions, duration: 0 });
    }, 80);
    return () => window.clearTimeout(t);
  }, [isMobile, fitView, fitViewOptions, data.members.length]);

  const editingMember = editingId
    ? data.members.find((m) => m.id === editingId)
    : undefined;

  const handleSubmitUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId) return;
    const form = new FormData(event.currentTarget);
    const full_name = String(form.get("full_name") ?? "").trim();
    if (!full_name) return;

    onPlaceholderUpdate?.({
      id: editingId,
      full_name,
      is_alive: form.get("life_status") !== "DECEASED",
      gender: (form.get("gender") as PlaceholderUpdatePayload["gender"]) || "UNKNOWN",
    });
    setEditingId(null);
  };

  const livingIds = data.members
    .filter((m) => !m.status.is_placeholder)
    .map((m) => m.id);

  return (
    <div className={["ft-root", className].filter(Boolean).join(" ")}>
      {showToolbar ? (
        <div className="ft-toolbar" aria-label="Công cụ cây">
          <SmartSearch
            members={data.members}
            onSelect={(id) => {
              focusMember(id);
              traceRoute(id);
            }}
          />
          <button type="button" onClick={() => clearHighlight()}>
            Xoá highlight
          </button>
          {!isMobile
            ? livingIds.slice(0, 3).map((id) => {
                const m = data.members.find((x) => x.id === id);
                if (!m) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => traceRoute(id)}
                    title={`Trace: ${m.full_name || id}`}
                  >
                    Trace {m.full_name || id}
                  </button>
                );
              })
            : null}
        </div>
      ) : null}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={interactive ? onNodesChange : undefined}
        onEdgesChange={interactive ? onEdgesChange : undefined}
        onNodeDoubleClick={(_, node) => {
          onMemberDoubleClick?.(node.id);
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={fitViewOptions}
        onlyRenderVisibleElements
        minZoom={0.15}
        maxZoom={2}
        panOnScroll={interactive}
        panOnDrag={interactive}
        zoomOnScroll={interactive}
        zoomOnPinch={interactive}
        nodesDraggable={interactive && !isMobile}
        nodesConnectable={false}
        elementsSelectable={interactive}
        selectionOnDrag={false}
        proOptions={{ hideAttribution: true }}
      >
        {showBackground ? (
          <Background gap={22} size={1} color="rgba(138, 106, 58, 0.22)" />
        ) : null}
        {showMiniMap ? (
          <MiniMap
            pannable
            zoomable
            nodeStrokeWidth={2}
            nodeColor={(node) => {
              if (node.type === "placeholder") return "#a8a29a";
              const status = (node.data as { lifeStatus?: string }).lifeStatus;
              return status === "DECEASED" ? "#6b5a3e" : "#2f7d4a";
            }}
          />
        ) : null}
        {showControls ? <Controls showInteractive={false} /> : null}
      </ReactFlow>

      {!readOnly && editingMember ? (
        <div className="ft-modal-backdrop" role="presentation">
          <form
            className="ft-modal"
            onSubmit={handleSubmitUpdate}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ft-placeholder-title"
          >
            <h2 id="ft-placeholder-title">Cập nhật khuyết danh</h2>
            <p>
              Đời thứ {memberGeneration(editingMember)} · id{" "}
              <code>{editingMember.id}</code>
            </p>
            <label htmlFor="full_name">Họ và tên</label>
            <input
              id="full_name"
              name="full_name"
              required
              autoFocus
              placeholder="Nhập họ tên đầy đủ"
            />
            <label htmlFor="life_status">Trạng thái</label>
            <select
              id="life_status"
              name="life_status"
              defaultValue={editingMember.status.is_alive ? "LIVING" : "DECEASED"}
            >
              <option value="LIVING">Đang sống</option>
              <option value="DECEASED">Đã mất</option>
            </select>
            <label htmlFor="gender">Giới tính</label>
            <select
              id="gender"
              name="gender"
              defaultValue={editingMember.gender ?? "UNKNOWN"}
            >
              <option value="MALE">Nam</option>
              <option value="FEMALE">Nữ</option>
              <option value="UNKNOWN">Chưa rõ</option>
            </select>
            <div className="ft-modal__actions">
              <button
                type="button"
                className="ft-btn-ghost"
                onClick={() => setEditingId(null)}
              >
                Huỷ
              </button>
              <button type="submit" className="ft-btn-primary">
                Lưu
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export const FamilyTree = forwardRef<FamilyTreeHandle, FamilyTreeProps>(
  function FamilyTree(props, ref) {
    return (
      <ReactFlowProvider>
        <FamilyTreeInner {...props} treeRef={ref} />
      </ReactFlowProvider>
    );
  },
);

export default FamilyTree;
