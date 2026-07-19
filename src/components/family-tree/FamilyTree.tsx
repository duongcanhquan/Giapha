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
  parseSpouseNodeId,
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
import { SpouseNode, type SpouseNodeData } from "./nodes/SpouseNode";
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
  spouse: SpouseNode,
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
  /** Khoá lọc chi (trưởng nhánh) — không cho «Mọi chi» */
  branchFilterLocked?: boolean;
  /** Giới hạn các chi trưởng nhánh được xem (1 hoặc nhiều) */
  allowedBranchIds?: string[] | null;
};

function bloodMemberId(nodeOrMemberId: string): string {
  return parseSpouseNodeId(nodeOrMemberId)?.partnerId ?? nodeOrMemberId;
}

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
        animated:
          e.data?.relationshipType === "ADOPTED" || e.data?.kind === "MOTHER",
        data: { ...e.data!, dimmed: false, highlighted: false },
      })),
    };
  }

  const spouseParsed = parseSpouseNodeId(targetId);
  const bloodTarget = spouseParsed?.partnerId ?? targetId;
  const route = resolveTraceRoute(bloodTarget, members, relations);

  const hlNodes = new Set(route.pathNodeIds);
  if (spouseParsed) hlNodes.add(targetId);

  for (const n of nodes) {
    if (n.type !== "spouse") continue;
    const d = n.data as SpouseNodeData;
    if (hlNodes.has(d.partnerId)) hlNodes.add(n.id);
  }

  const hlEdges = new Set(route.pathEdgeIds);
  for (const e of edges) {
    if (hlNodes.has(e.source) && hlNodes.has(e.target)) {
      if (
        e.data?.kind === "MARRIAGE" ||
        e.data?.kind === "MOTHER" ||
        e.data?.kind === "BLOOD" ||
        e.data?.kind === "ADOPTED"
      ) {
        hlEdges.add(e.id);
      }
    }
  }

  return {
    nodes: nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        dimmed: !hlNodes.has(n.id),
        highlighted: hlNodes.has(n.id),
      },
    })),
    edges: edges.map((e) => {
      const highlighted = hlEdges.has(e.id);
      return {
        ...e,
        animated:
          e.data?.relationshipType === "ADOPTED" ||
          e.data?.kind === "MOTHER" ||
          highlighted,
        data: {
          ...e.data!,
          dimmed: !highlighted,
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
  branchFilterLocked = false,
  allowedBranchIds = null,
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
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const seededForFamily = useRef<string | null>(null);
  const clickTimerRef = useRef<number | null>(null);
  const overviewDoneRef = useRef(false);
  const pendingFitPathRef = useRef<string | null>(null);
  const fitTimersRef = useRef<number[]>([]);

  const clearFitTimers = useCallback(() => {
    for (const id of fitTimersRef.current) window.clearTimeout(id);
    fitTimersRef.current = [];
  }, []);

  const scheduleFit = useCallback(
    (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        fitTimersRef.current = fitTimersRef.current.filter((t) => t !== id);
        fn();
      }, ms);
      fitTimersRef.current.push(id);
    },
    [],
  );

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
      clearFitTimers();
    };
  }, [clearFitTimers]);

  // Nhận lọc chi từ Infographic mà không remount cây (tránh mất/nhảy UI)
  useEffect(() => {
    if (branchFilterControlled === undefined) return;
    setBranchFilter(branchFilterControlled);
  }, [branchFilterControlled]);

  const setBranchFilterSafe = useCallback(
    (next: string | null | ((cur: string | null) => string | null)) => {
      setBranchFilter((cur) => {
        const resolved = typeof next === "function" ? next(cur) : next;
        if (branchFilterLocked && !resolved) {
          return branchFilterControlled ?? cur;
        }
        return resolved;
      });
    },
    [branchFilterLocked, branchFilterControlled],
  );

  const includeIds = useMemo(() => {
    if (viewMode !== "lineage" || !highlightId) return null;
    const bloodId = bloodMemberId(highlightId);
    return lineageNeighborhoodIds(data.members, bloodId, childrenIndex);
  }, [viewMode, highlightId, data.members, childrenIndex]);

  const searchMembers = useMemo(() => {
    let list = data.members;
    if (allowedBranchIds?.length) {
      list = list.filter((m) =>
        allowedBranchIds.includes(m.tree_logic.branch_id),
      );
    }
    if (branchFilterLocked && branchFilter) {
      list = list.filter((m) => m.tree_logic.branch_id === branchFilter);
    }
    return list;
  }, [data.members, branchFilterLocked, branchFilter, allowedBranchIds]);

  const visibleData = useMemo((): FamilyTreeData => {
    const members = filterVisibleMembers(data.members, {
      collapsedIds,
      branchId: branchFilter,
      allowedBranchIds,
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
  }, [data, collapsedIds, branchFilter, allowedBranchIds, includeIds]);

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

  const fullChildCountById = useMemo(() => {
    const map = new Map<string, number>();
    for (const [id, kids] of childrenIndex) {
      map.set(id, kids.length);
    }
    return map;
  }, [childrenIndex]);

  const baseGraph = useMemo(
    () => buildFlowGraph(visibleData, { fullChildCountById }),
    [visibleData, fullChildCountById],
  );

  const enrichedNodes = useMemo(() => {
    return baseGraph.nodes.map((node) => {
      if (node.type !== "member") return node;
      const fullChildCount = childrenIndex.get(node.id)?.length ?? 0;
      const collapsed = collapsedIds.has(node.id);
      const hiddenDescendantCount = collapsed
        ? countDescendants(node.id, childrenIndex)
        : 0;
      return {
        ...node,
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
      const bloodId = bloodMemberId(targetId);
      const member = data.members.find((m) => m.id === bloodId);
      if (!member) {
        fitOverview(true);
        return;
      }
      const pathIds = [...member.tree_logic.path];
      for (const m of data.members) {
        if (m.tree_logic.parent_id === bloodId) pathIds.push(m.id);
      }
      // Kèm node dâu/rể của người trên path (nếu đã render)
      const withSpouses = [...pathIds];
      for (const id of pathIds) {
        const m = data.members.find((x) => x.id === id);
        if (!m) continue;
        for (const s of m.spouses) {
          withSpouses.push(`spouse:${id}:${s.id}`);
        }
      }
      const visiblePath = withSpouses.filter((id) => Boolean(getNode(id)));
      if (visiblePath.length === 0) {
        scheduleFit(() => {
          const retry = withSpouses.filter((id) => Boolean(getNode(id)));
          if (retry.length === 0) {
            fitOverview(true);
            return;
          }
          void fitView({
            nodes: retry.map((id) => ({ id })),
            padding: 0.28,
            maxZoom: 1.2,
            minZoom: 0.05,
            duration: isMobile ? 0 : 420,
          });
        }, 180);
        return;
      }
      void fitView({
        nodes: visiblePath.map((id) => ({ id })),
        padding: 0.28,
        maxZoom: 1.2,
        minZoom: 0.05,
        duration: isMobile ? 0 : 420,
      });
    },
    [data.members, getNode, fitView, fitOverview, scheduleFit, isMobile],
  );

  const focusMember = useCallback(
    (targetId: string) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => fitToPath(bloodMemberId(targetId)));
      });
    },
    [fitToPath],
  );

  const revealAndFocus = useCallback(
    (rawTargetId: string) => {
      const spouseHit = parseSpouseNodeId(rawTargetId);
      const bloodId = spouseHit?.partnerId ?? rawTargetId;
      const member = data.members.find((m) => m.id === bloodId);
      if (!member) return;

      const highlightKey = spouseHit ? rawTargetId : bloodId;

      setCollapsedIds((prev) => {
        const next = expandAncestors(prev, member.tree_logic.path);
        next.delete(bloodId);
        return next;
      });
      if (
        branchFilter &&
        member.tree_logic.branch_id !== branchFilter &&
        !branchFilterLocked
      ) {
        setBranchFilterSafe(null);
      }
      setHighlightId(highlightKey);
      pendingFitPathRef.current = bloodId;

      scheduleFit(() => {
        if (pendingFitPathRef.current !== bloodId) return;
        fitToPath(bloodId);
        pendingFitPathRef.current = null;
      }, 160);
    },
    [
      data.members,
      branchFilter,
      branchFilterLocked,
      fitToPath,
      scheduleFit,
      setBranchFilterSafe,
    ],
  );

  const openNode = useCallback(
    (nodeId: string, mode: "view" | "edit") => {
      const spouseHit = parseSpouseNodeId(nodeId);
      const bloodId = spouseHit?.partnerId ?? nodeId;
      revealAndFocus(nodeId);
      if (mode === "edit" && !spouseHit && !readOnly && onMemberDoubleClick) {
        onMemberDoubleClick(bloodId);
        return;
      }
      onMemberOpen?.(bloodId);
    },
    [revealAndFocus, readOnly, onMemberDoubleClick, onMemberOpen],
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

  // Lần đầu có node: fit overview một lần (tránh nhiều fitView chồng)
  useEffect(() => {
    if (!nodes.length || highlightId || overviewDoneRef.current) return;
    const t = window.setTimeout(() => {
      fitOverview(false);
      overviewDoneRef.current = true;
    }, 120);
    return () => window.clearTimeout(t);
  }, [nodes.length, fitOverview, highlightId]);

  // Sau expand path tìm kiếm — so khớp theo blood id
  useEffect(() => {
    const pending = pendingFitPathRef.current;
    if (!pending || !highlightId) return;
    if (pending !== bloodMemberId(highlightId)) return;
    const t = window.setTimeout(() => {
      if (pendingFitPathRef.current !== pending) return;
      fitToPath(pending);
      pendingFitPathRef.current = null;
    }, 120);
    return () => window.clearTimeout(t);
  }, [nodes.length, highlightId, fitToPath]);

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
  const visibleBranches = allowedBranchIds?.length
    ? branches.filter((b) => allowedBranchIds.includes(b.id))
    : branchFilterLocked
      ? branches.filter((b) => b.id === branchFilter)
      : branches;
  const visibleCount = visibleData.members.length;
  const totalCount = data.members.length;
  const showMiniMapEffective = showMiniMap && !isMobile;
  const instantOpen =
    isMobile || readOnly || typeof onMemberDoubleClick !== "function";

  return (
    <div
      className={[
        "ft-root",
        isMobile ? "ft-root--mobile" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showToolbar ? (
        <div
          className={[
            "ft-toolbar",
            isMobile && !toolbarOpen ? "ft-toolbar--collapsed" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label="Công cụ cây"
        >
          <SmartSearch
            members={searchMembers}
            branches={visibleBranches.length ? visibleBranches : branches}
            onSelect={(id) => {
              revealAndFocus(id);
              onMemberOpen?.(id);
            }}
          />

          {isMobile ? (
            <button
              type="button"
              className="ft-toolbar__toggle"
              onClick={() => setToolbarOpen((v) => !v)}
              aria-expanded={toolbarOpen}
            >
              {toolbarOpen ? "Ẩn công cụ" : "Công cụ"}
            </button>
          ) : null}

          <div
            className="ft-toolbar__extra"
            hidden={isMobile && !toolbarOpen ? true : undefined}
          >
            <div className="ft-toolbar__modes" role="group" aria-label="Chế độ xem">
              <button
                type="button"
                data-active={viewMode === "compact"}
                onClick={() => {
                  setViewMode("compact");
                  setCollapsedIds(
                    computeCompactCollapsedIds(data.members, childrenIndex, 3),
                  );
                  overviewDoneRef.current = false;
                  scheduleFit(() => fitOverview(true), 220);
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
                  overviewDoneRef.current = false;
                  scheduleFit(() => fitOverview(true), 220);
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

            {visibleBranches.length > 0 ? (
              <div
                className="ft-toolbar__branches"
                role="group"
                aria-label="Lọc chi"
              >
                {!branchFilterLocked ? (
                  <button
                    type="button"
                    data-active={branchFilter === null}
                    onClick={() => setBranchFilterSafe(null)}
                  >
                    Mọi chi
                  </button>
                ) : null}
                {visibleBranches.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    data-active={branchFilter === b.id}
                    disabled={branchFilterLocked}
                    onClick={() => {
                      if (branchFilterLocked) return;
                      setBranchFilterSafe((cur) =>
                        cur === b.id ? null : b.id,
                      );
                    }}
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

            <div
              className="ft-life-legend"
              aria-label="Chú thích sống / mất / dâu rể"
            >
              <span className="ft-life-legend__item ft-life-legend__item--living">
                <i /> Còn sống
              </span>
              <span className="ft-life-legend__item ft-life-legend__item--deceased">
                <i /> Đã mất
              </span>
              <span className="ft-life-legend__item ft-life-legend__item--dau">
                <i /> Con dâu
              </span>
              <span className="ft-life-legend__item ft-life-legend__item--re">
                <i /> Con rể
              </span>
            </div>

            <span className="ft-toolbar__count" title="Số người đang hiện / tổng">
              {visibleCount}/{totalCount}
            </span>
          </div>
        </div>
      ) : null}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={interactive ? onNodesChange : undefined}
        onEdgesChange={interactive ? onEdgesChange : undefined}
        onNodeClick={(_, node) => {
          if (!interactive && !onMemberOpen) return;
          if (instantOpen) {
            if (clickTimerRef.current != null) {
              window.clearTimeout(clickTimerRef.current);
              clickTimerRef.current = null;
            }
            openNode(node.id, "view");
            return;
          }
          if (clickTimerRef.current != null) {
            window.clearTimeout(clickTimerRef.current);
          }
          clickTimerRef.current = window.setTimeout(() => {
            clickTimerRef.current = null;
            openNode(node.id, "view");
          }, 220);
        }}
        onNodeDoubleClick={(_, node) => {
          if (clickTimerRef.current != null) {
            window.clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
          }
          openNode(node.id, readOnly || instantOpen ? "view" : "edit");
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView={false}
        fitViewOptions={fitViewOptions}
        onInit={(instance) => {
          scheduleFit(() => {
            void instance.fitView({
              padding: 0.16,
              minZoom: 0.01,
              maxZoom: 1.15,
              duration: 0,
            });
            overviewDoneRef.current = true;
          }, 40);
        }}
        onlyRenderVisibleElements
        minZoom={0.01}
        maxZoom={2.5}
        panOnScroll={interactive}
        panOnDrag={interactive}
        zoomOnScroll={interactive}
        zoomOnPinch={interactive}
        preventScrolling={interactive}
        nodesDraggable={interactive && !readOnly && !isMobile}
        nodesConnectable={false}
        elementsSelectable={interactive}
        selectionOnDrag={false}
        proOptions={{ hideAttribution: true }}
      >
        {showBackground && !isMobile ? (
          <Background gap={22} size={1} color="rgba(138, 106, 58, 0.22)" />
        ) : null}
        {showMiniMapEffective ? (
          <MiniMap
            pannable
            zoomable
            nodeStrokeWidth={2}
            nodeColor={(node) => {
              if (node.type === "placeholder") return "#a8a29a";
              if (node.type === "spouse") {
                const role = (node.data as SpouseNodeData).role;
                return role === "RE" ? "#6b7f9a" : "#9a6b8a";
              }
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
