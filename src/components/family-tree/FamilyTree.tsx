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
  /** Double-click — sửa (dashboard) */
  onMemberDoubleClick?: (memberId: string) => void;
  /** Click chọn ổn định — xem hồ sơ */
  onMemberOpen?: (memberId: string) => void;
  initialHighlightId?: string | null;
  showToolbar?: boolean;
  showMiniMap?: boolean;
  showControls?: boolean;
  showBackground?: boolean;
  interactive?: boolean;
  readOnly?: boolean;
  /** Xuất PDF: luôn mở toàn cây */
  forceExpanded?: boolean;
  /** Lọc chi khi mount / điều khiển từ ngoài (không remount) */
  initialBranchFilter?: string | null;
  branchFilterControlled?: string | null;
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
  onMemberOpen,
  initialHighlightId = null,
  showToolbar = true,
  showMiniMap = true,
  showControls = true,
  showBackground = true,
  interactive = true,
  readOnly = false,
  forceExpanded = false,
  initialBranchFilter = null,
  branchFilterControlled,
  treeRef,
}: InnerProps) {
  const { fitView, getNode } = useReactFlow();
  const isMobile = useIsMobileViewport();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(
    initialHighlightId,
  );
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    forceExpanded
      ? "full"
      : data.members.length >= LARGE_TREE_THRESHOLD
        ? "compact"
        : "full",
  );
  const [branchFilter, setBranchFilter] = useState<string | null>(
    initialBranchFilter,
  );
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() =>
    forceExpanded ? new Set() : new Set(),
  );
  const seededForFamily = useRef<string | null>(null);
  const clickTimerRef = useRef<number | null>(null);
  const overviewDoneRef = useRef(false);
  const pendingFitPathRef = useRef<string | null>(null);

  const childrenIndex = useMemo(
    () => buildChildrenIndex(data.members),
    [data.members],
  );

  // Seed gom nhánh một lần khi đổi gia phả / lần đầu có dữ liệu
  useEffect(() => {
    if (forceExpanded) {
      setViewMode("full");
      setCollapsedIds(new Set());
      return;
    }
    const familyKey = data.family_id ?? data.clan_name;
    if (!data.members.length) return;
    if (seededForFamily.current === familyKey) return;
    seededForFamily.current = familyKey;

    const large = data.members.length >= LARGE_TREE_THRESHOLD;
    setViewMode(large ? "compact" : "full");
    setBranchFilter(initialBranchFilter);
    setHighlightId(initialHighlightId);
    setCollapsedIds(
      large
        ? computeCompactCollapsedIds(data.members, childrenIndex, 3)
        : new Set(),
    );
  }, [
    forceExpanded,
    data.family_id,
    data.clan_name,
    data.members,
    childrenIndex,
    initialHighlightId,
    initialBranchFilter,
  ]);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current != null) {
        window.clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  // Nhận lọc chi từ Infographic mà không remount cây (tránh mất/nhảy UI)
  useEffect(() => {
    if (branchFilterControlled === undefined) return;
    setBranchFilter(branchFilterControlled);
  }, [branchFilterControlled]);

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
      padding: 0.16,
      minZoom: 0.01,
      maxZoom: 1.15,
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
      const visibleChildCount =
        "childCount" in node.data ? Number(node.data.childCount ?? 0) : 0;
      // Luôn lấy số con từ FULL tree — không dùng childCount của graph đã lọc
      // (sau gom nhánh children bị ẩn → childCount=0 → mất nút xổ nhánh).
      const fullChildCount = childrenIndex.get(node.id)?.length ?? 0;
      const collapsed = collapsedIds.has(node.id);
      const hiddenDescendantCount = collapsed
        ? countDescendants(node.id, childrenIndex)
        : 0;
      const heightBoost =
        fullChildCount > 0 && visibleChildCount === 0 ? 32 : 0;
      return {
        ...node,
        height:
          node.height != null ? node.height + heightBoost : node.height,
        data: {
          ...node.data,
          childCount: fullChildCount,
          collapsed,
          hiddenDescendantCount,
          onToggleCollapse: fullChildCount > 0 ? toggleCollapse : undefined,
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

  const fitOverview = useCallback(
    (animated = false) => {
      // Cho phép zoom rất nhỏ để 500 node vẫn vào khung — tránh canvas trắng
      void fitView({
        padding: 0.16,
        minZoom: 0.01,
        maxZoom: 1.15,
        duration: animated ? 380 : 0,
      });
    },
    [fitView],
  );

  const fitToPath = useCallback(
    (targetId: string) => {
      const member = data.members.find((m) => m.id === targetId);
      if (!member) {
        fitOverview(true);
        return;
      }
      const pathIds = [...member.tree_logic.path];
      for (const m of data.members) {
        if (m.tree_logic.parent_id === targetId) pathIds.push(m.id);
      }
      const visiblePath = pathIds.filter((id) => Boolean(getNode(id)));
      if (visiblePath.length === 0) {
        window.setTimeout(() => {
          const retry = pathIds.filter((id) => Boolean(getNode(id)));
          if (retry.length === 0) {
            fitOverview(true);
            return;
          }
          void fitView({
            nodes: retry.map((id) => ({ id })),
            padding: 0.28,
            maxZoom: 1.2,
            minZoom: 0.05,
            duration: 520,
          });
        }, 180);
        return;
      }
      void fitView({
        nodes: visiblePath.map((id) => ({ id })),
        padding: 0.28,
        maxZoom: 1.2,
        minZoom: 0.05,
        duration: 520,
      });
    },
    [data.members, getNode, fitView, fitOverview],
  );

  const focusMember = useCallback(
    (targetId: string) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => fitToPath(targetId));
      });
    },
    [fitToPath],
  );

  const revealAndFocus = useCallback(
    (targetId: string) => {
      const member = data.members.find((m) => m.id === targetId);
      if (!member) return;

      // Mở đúng tổ tiên trên path + xổ chính người được tìm (thấy con trực tiếp)
      setCollapsedIds((prev) => {
        const next = expandAncestors(prev, member.tree_logic.path);
        next.delete(targetId);
        return next;
      });
      if (branchFilter && member.tree_logic.branch_id !== branchFilter) {
        setBranchFilter(null);
      }
      setHighlightId(targetId);
      pendingFitPathRef.current = targetId;

      // Đợi layout ổn định rồi khung đúng đường huyết thống
      window.setTimeout(() => {
        if (pendingFitPathRef.current !== targetId) return;
        fitToPath(targetId);
        pendingFitPathRef.current = null;
      }, 160);
    },
    [data.members, branchFilter, fitToPath],
  );

  const traceRoute = useCallback(
    (targetId: string) => {
      revealAndFocus(targetId);
    },
    [revealAndFocus],
  );

  const clearHighlight = useCallback(() => {
    setHighlightId(null);
    pendingFitPathRef.current = null;
    fitOverview(true);
  }, [fitOverview]);

  useImperativeHandle(
    treeRef,
    () => ({
      traceRoute,
      highlightPath: traceRoute,
      clearHighlight,
      focusMember,
      fitView: () => fitOverview(true),
    }),
    [traceRoute, clearHighlight, focusMember, fitOverview],
  );

  // Lần đầu + khi đổi số node: fit vào khung (tránh viewport lệch → trắng)
  useEffect(() => {
    if (!nodes.length) return;
    // Đang tìm / highlight path — không cướp camera
    if (highlightId) return;
    const t = window.setTimeout(() => {
      fitOverview(!overviewDoneRef.current);
      overviewDoneRef.current = true;
    }, 200);
    return () => window.clearTimeout(t);
  }, [nodes.length, forceExpanded, fitOverview, highlightId]);

  // Sau expand path tìm kiếm
  useEffect(() => {
    const pending = pendingFitPathRef.current;
    if (!pending || !highlightId) return;
    if (pending !== highlightId) return;
    const t = window.setTimeout(() => {
      if (pendingFitPathRef.current !== pending) return;
      fitToPath(pending);
      pendingFitPathRef.current = null;
    }, 120);
    return () => window.clearTimeout(t);
  }, [nodes, highlightId, fitToPath]);

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
            onSelect={(id) => {
              revealAndFocus(id);
              onMemberOpen?.(id);
            }}
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
                window.setTimeout(() => fitOverview(true), 220);
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
                // Fit lại sau khi bung toàn bộ (tránh canvas trắng)
                window.setTimeout(() => fitOverview(true), 220);
              }}
              title="Hiện toàn bộ node — cây lớn sẽ rất nhỏ; dùng zoom/search để đọc"
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

          <div className="ft-life-legend" aria-label="Chú thích sống / mất">
            <span className="ft-life-legend__item ft-life-legend__item--living">
              <i /> Còn sống
            </span>
            <span className="ft-life-legend__item ft-life-legend__item--deceased">
              <i /> Đã mất
            </span>
          </div>

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
          // Cho phép xem / tìm / highlight cả khi readOnly (link chia sẻ công khai)
          if (!interactive && !onMemberOpen) return;
          if (clickTimerRef.current != null) {
            window.clearTimeout(clickTimerRef.current);
          }
          // Trì hoãn để phân biệt double-click (sửa) vs click (xem info)
          clickTimerRef.current = window.setTimeout(() => {
            clickTimerRef.current = null;
            revealAndFocus(node.id);
            onMemberOpen?.(node.id);
          }, 220);
        }}
        onNodeDoubleClick={(_, node) => {
          if (clickTimerRef.current != null) {
            window.clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
          }
          revealAndFocus(node.id);
          if (readOnly) {
            onMemberOpen?.(node.id);
            return;
          }
          if (onMemberDoubleClick) onMemberDoubleClick(node.id);
          else onMemberOpen?.(node.id);
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={fitViewOptions}
        onInit={(instance) => {
          window.setTimeout(() => {
            void instance.fitView({
              padding: 0.16,
              minZoom: 0.01,
              maxZoom: 1.15,
              duration: 0,
            });
            overviewDoneRef.current = true;
          }, 60);
        }}
        onlyRenderVisibleElements={false}
        minZoom={0.01}
        maxZoom={2.5}
        panOnScroll={interactive}
        panOnDrag={interactive}
        zoomOnScroll={interactive}
        zoomOnPinch={interactive}
        nodesDraggable={interactive && !readOnly && !isMobile}
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
              return status === "DECEASED" ? "#6b6460" : "#3d7a58";
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
