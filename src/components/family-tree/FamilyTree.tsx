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
  useRef,
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
import {
  buildChildrenIndex,
  computeCompactCollapsedIds,
  countDescendants,
  expandAncestors,
  filterVisibleMembers,
  filterVisibleRelations,
  lineageNeighborhoodIds,
  type ViewMode,
} from "@/lib/genealogy/visible-tree";
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

const LARGE_TREE_THRESHOLD = 80;

export type FamilyTreeHandle = {
  traceRoute: (targetId: string) => void;
  /** @deprecated dùng `traceRoute` */
  highlightPath: (targetId: string) => void;
  clearHighlight: () => void;
  fitView: () => void;
  focusMember: (targetId: string) => void;
};

export type FamilyTreeProps = {
  data: FamilyTreeData;
  className?: string;
  onPlaceholderUpdate?: (payload: PlaceholderUpdatePayload) => void;
  onMemberDoubleClick?: (memberId: string) => void;
  initialHighlightId?: string | null;
  showToolbar?: boolean;
  showMiniMap?: boolean;
  showControls?: boolean;
  showBackground?: boolean;
  interactive?: boolean;
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
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    data.members.length >= LARGE_TREE_THRESHOLD ? "compact" : "full",
  );
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const seededForFamily = useRef<string | null>(null);

  const childrenIndex = useMemo(
    () => buildChildrenIndex(data.members),
    [data.members],
  );

  // Seed gom nhánh một lần khi đổi gia phả / lần đầu có dữ liệu
  useEffect(() => {
    const familyKey = data.family_id ?? data.clan_name;
    if (!data.members.length) return;
    if (seededForFamily.current === familyKey) return;
    seededForFamily.current = familyKey;

    const large = data.members.length >= LARGE_TREE_THRESHOLD;
    setViewMode(large ? "compact" : "full");
    setBranchFilter(null);
    setHighlightId(initialHighlightId);
    setCollapsedIds(
      large
        ? computeCompactCollapsedIds(data.members, childrenIndex, 3)
        : new Set(),
    );
  }, [
    data.family_id,
    data.clan_name,
    data.members,
    childrenIndex,
    initialHighlightId,
  ]);

  const includeIds = useMemo(() => {
    if (viewMode !== "lineage" || !highlightId) return null;
    return lineageNeighborhoodIds(data.members, highlightId, childrenIndex);
  }, [viewMode, highlightId, data.members, childrenIndex]);

  const visibleData = useMemo((): FamilyTreeData => {
    const members = filterVisibleMembers(data.members, {
      collapsedIds,
      branchId: branchFilter,
      includeIds,
    });
    // Nếu lọc chi làm mất thủy tổ path-connect — vẫn OK vì mỗi nhánh có subtree
    const visibleIds = new Set(members.map((m) => m.id));
    const relations = filterVisibleRelations(data.relations, visibleIds);
    return {
      ...data,
      members,
      relations,
    };
  }, [data, collapsedIds, branchFilter, includeIds]);

  const fitViewOptions = useMemo(
    () => ({
      padding: isMobile ? 0.35 : 0.2,
      maxZoom: isMobile ? 0.85 : 1.2,
      duration: isMobile ? 0 : 200,
    }),
    [isMobile],
  );

  const openUpdate = useCallback(
    (memberId: string) => {
      if (readOnly) return;
      setEditingId(memberId);
    },
    [readOnly],
  );

  const toggleCollapse = useCallback((memberId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  }, []);

  const baseGraph = useMemo(
    () => buildFlowGraph(visibleData),
    [visibleData],
  );

  const enrichedNodes = useMemo(() => {
    return baseGraph.nodes.map((node) => {
      if (node.type !== "member") return node;
      const childCount =
        "childCount" in node.data ? (node.data.childCount as number) : 0;
      const collapsed = collapsedIds.has(node.id);
      const hiddenDescendantCount = collapsed
        ? countDescendants(node.id, childrenIndex)
        : 0;
      return {
        ...node,
        data: {
          ...node.data,
          collapsed,
          hiddenDescendantCount,
          onToggleCollapse: childCount > 0 ? toggleCollapse : undefined,
        },
      };
    });
  }, [baseGraph.nodes, collapsedIds, childrenIndex, toggleCollapse]);

  const seeded = useMemo(() => {
    const withHandlers = attachPlaceholderHandler(
      enrichedNodes,
      openUpdate,
      readOnly,
    );
    // Highlight relative to FULL tree path so ancestors stay marked even if filtered
    return applyHighlight(
      withHandlers,
      baseGraph.edges,
      data.members,
      data.relations,
      highlightId,
    );
  }, [
    enrichedNodes,
    baseGraph.edges,
    data.members,
    data.relations,
    highlightId,
    openUpdate,
    readOnly,
  ]);

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

  const revealAndFocus = useCallback(
    (targetId: string) => {
      const member = data.members.find((m) => m.id === targetId);
      if (!member) return;

      // Mở đường tổ tiên + bỏ lọc chi nếu cần để thấy người đó
      setCollapsedIds((prev) => expandAncestors(prev, member.tree_logic.path));
      if (
        branchFilter &&
        member.tree_logic.branch_id !== branchFilter
      ) {
        setBranchFilter(null);
      }
      setHighlightId(targetId);
      if (viewMode === "lineage") {
        // keep lineage mode — includeIds updates via highlightId
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const node = getNode(targetId);
          if (node) {
            centerOnTarget(targetId, 1.25);
          } else {
            // chờ re-layout sau expand
            window.setTimeout(() => {
              const n2 = getNode(targetId);
              if (n2) centerOnTarget(targetId, 1.25);
              else void fitView({ ...fitViewOptions, duration: 400 });
            }, 80);
          }
        });
      });
    },
    [
      data.members,
      branchFilter,
      viewMode,
      getNode,
      centerOnTarget,
      fitView,
      fitViewOptions,
    ],
  );

  const traceRoute = useCallback(
    (targetId: string) => {
      revealAndFocus(targetId);
    },
    [revealAndFocus],
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

  useEffect(() => {
    if (!isMobile) return;
    const t = window.setTimeout(() => {
      void fitView({ ...fitViewOptions, duration: 0 });
    }, 80);
    return () => window.clearTimeout(t);
  }, [isMobile, fitView, fitViewOptions, visibleData.members.length]);

  // Fit lại khi gom/mở nhánh đổi layout
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (highlightId) {
        const node = getNode(highlightId);
        if (node) centerOnTarget(highlightId, 1.1);
        else void fitView({ ...fitViewOptions, duration: 280 });
      }
    }, 60);
    return () => window.clearTimeout(t);
  }, [
    collapsedIds,
    branchFilter,
    viewMode,
    highlightId,
    getNode,
    centerOnTarget,
    fitView,
    fitViewOptions,
  ]);

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
      gender:
        (form.get("gender") as PlaceholderUpdatePayload["gender"]) || "UNKNOWN",
    });
    setEditingId(null);
  };

  const branches = data.branches ?? [];
  const visibleCount = visibleData.members.length;
  const totalCount = data.members.length;

  return (
    <div className={["ft-root", className].filter(Boolean).join(" ")}>
      {showToolbar ? (
        <div className="ft-toolbar" aria-label="Công cụ cây">
          <SmartSearch
            members={data.members}
            branches={branches}
            onSelect={(id) => revealAndFocus(id)}
          />

          <div className="ft-toolbar__modes" role="group" aria-label="Chế độ xem">
            <button
              type="button"
              data-active={viewMode === "compact"}
              onClick={() => {
                setViewMode("compact");
                setCollapsedIds(
                  computeCompactCollapsedIds(data.members, childrenIndex, 3),
                );
              }}
              title="Thu gọn từ đời 3 — dễ đọc cây dài"
            >
              Gom nhánh
            </button>
            <button
              type="button"
              data-active={viewMode === "full"}
              onClick={() => {
                setViewMode("full");
                setCollapsedIds(new Set());
              }}
              title="Hiện toàn bộ node"
            >
              Toàn cây
            </button>
            <button
              type="button"
              data-active={viewMode === "lineage"}
              disabled={!highlightId}
              onClick={() => setViewMode("lineage")}
              title="Chỉ tổ tiên, anh em và con của người đang chọn"
            >
              Dòng họ gần
            </button>
          </div>

          {branches.length > 0 ? (
            <div className="ft-toolbar__branches" role="group" aria-label="Lọc chi">
              <button
                type="button"
                data-active={branchFilter === null}
                onClick={() => setBranchFilter(null)}
              >
                Mọi chi
              </button>
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  data-active={branchFilter === b.id}
                  onClick={() =>
                    setBranchFilter((cur) => (cur === b.id ? null : b.id))
                  }
                  title={b.description || b.name}
                >
                  {b.name}
                </button>
              ))}
            </div>
          ) : null}

          <button type="button" onClick={() => clearHighlight()}>
            Xoá highlight
          </button>

          <span className="ft-toolbar__count" title="Số người đang hiện / tổng">
            {visibleCount}/{totalCount}
          </span>
        </div>
      ) : null}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={interactive ? onNodesChange : undefined}
        onEdgesChange={interactive ? onEdgesChange : undefined}
        onNodeClick={(_, node) => {
          if (!interactive) return;
          revealAndFocus(node.id);
        }}
        onNodeDoubleClick={(_, node) => {
          onMemberDoubleClick?.(node.id);
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={fitViewOptions}
        onlyRenderVisibleElements
        minZoom={0.08}
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
              defaultValue={
                editingMember.status.is_alive ? "LIVING" : "DECEASED"
              }
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
