"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
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
  LifeStatus,
  PlaceholderUpdatePayload,
} from "@/types/genealogy";
import {
  buildFlowGraph,
  type FamilyFlowEdge,
  type FamilyFlowNode,
} from "@/lib/genealogy/build-flow";
import { highlightPath as resolveHighlightPath } from "@/lib/genealogy/highlight-path";
import { MemberNode } from "./nodes/MemberNode";
import { PlaceholderNode } from "./nodes/PlaceholderNode";
import { RelationshipEdge } from "./edges/RelationshipEdge";
import "./family-tree.css";

const nodeTypes = {
  member: MemberNode,
  placeholder: PlaceholderNode,
} satisfies NodeTypes;

const edgeTypes = {
  relationship: RelationshipEdge,
} satisfies EdgeTypes;

export type FamilyTreeHandle = {
  /** Highlight đường dẫn Thủy tổ → target_id, làm mờ phần còn lại, center camera. */
  highlightPath: (targetId: string) => void;
  clearHighlight: () => void;
  fitView: () => void;
};

export type FamilyTreeProps = {
  data: FamilyTreeData;
  className?: string;
  /** Gọi khi người dùng cập nhật placeholder từ form */
  onPlaceholderUpdate?: (payload: PlaceholderUpdatePayload) => void;
  /** Highlight sẵn khi mount (tuỳ chọn) */
  initialHighlightId?: string | null;
  showToolbar?: boolean;
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

  const route = resolveHighlightPath(targetId, members, relations);

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
  onOpenUpdate: (memberId: string) => void,
): FamilyFlowNode[] {
  return nodes.map((node) => {
    if (node.type !== "placeholder") return node;
    return {
      ...node,
      data: {
        ...node.data,
        onOpenUpdate,
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
  initialHighlightId = null,
  showToolbar = true,
  treeRef,
}: InnerProps) {
  const { fitView, setCenter, getNode } = useReactFlow();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(
    initialHighlightId,
  );

  const openUpdate = useCallback((memberId: string) => {
    setEditingId(memberId);
  }, []);

  const baseGraph = useMemo(() => buildFlowGraph(data), [data]);

  const seeded = useMemo(() => {
    const withHandlers = attachPlaceholderHandler(baseGraph.nodes, openUpdate);
    return applyHighlight(
      withHandlers,
      baseGraph.edges,
      data.members,
      data.relations,
      highlightId,
    );
  }, [baseGraph, data.members, data.relations, highlightId, openUpdate]);

  const [nodes, setNodes, onNodesChange] = useNodesState(seeded.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(seeded.edges);

  useEffect(() => {
    setNodes(seeded.nodes);
    setEdges(seeded.edges);
  }, [seeded, setNodes, setEdges]);

  const centerOnTarget = useCallback(
    (targetId: string) => {
      const node = getNode(targetId);
      if (!node) return;
      const width = node.measured?.width ?? 180;
      const height = node.measured?.height ?? 80;
      setCenter(node.position.x + width / 2, node.position.y + height / 2, {
        zoom: 1.15,
        duration: 480,
      });
    },
    [getNode, setCenter],
  );

  const highlightPath = useCallback(
    (targetId: string) => {
      setHighlightId(targetId);
      // Center after paint so measured sizes / highlight styles settle
      requestAnimationFrame(() => {
        requestAnimationFrame(() => centerOnTarget(targetId));
      });
    },
    [centerOnTarget],
  );

  const clearHighlight = useCallback(() => {
    setHighlightId(null);
  }, []);

  useImperativeHandle(
    treeRef,
    () => ({
      highlightPath,
      clearHighlight,
      fitView: () => {
        void fitView({ padding: 0.2, duration: 400 });
      },
    }),
    [highlightPath, clearHighlight, fitView],
  );

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
      life_status: (form.get("life_status") as LifeStatus) || "LIVING",
      gender: (form.get("gender") as PlaceholderUpdatePayload["gender"]) || "UNKNOWN",
    });
    setEditingId(null);
  };

  const livingIds = data.members
    .filter((m) => !m.is_placeholder)
    .map((m) => m.id);

  return (
    <div className={["ft-root", className].filter(Boolean).join(" ")}>
      {showToolbar ? (
        <div className="ft-toolbar" aria-label="Trace route">
          <button type="button" onClick={() => clearHighlight()}>
            Xoá highlight
          </button>
          {livingIds.slice(0, 5).map((id) => {
            const m = data.members.find((x) => x.id === id)!;
            return (
              <button
                key={id}
                type="button"
                onClick={() => highlightPath(id)}
                title={`Trace: ${m.full_name || id}`}
              >
                Trace {m.full_name || id}
              </button>
            );
          })}
        </div>
      ) : null}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.25}
        maxZoom={2}
        panOnScroll
        selectionOnDrag={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={22} size={1} color="rgba(138, 106, 58, 0.22)" />
        <MiniMap
          pannable
          zoomable
          nodeStrokeWidth={2}
          nodeColor={(node) => {
            if (node.type === "placeholder") return "#a8a29a";
            const status = (node.data as { lifeStatus?: LifeStatus }).lifeStatus;
            return status === "DECEASED" ? "#6b5a3e" : "#2f7d4a";
          }}
        />
        <Controls showInteractive={false} />
      </ReactFlow>

      {editingMember ? (
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
              Đời thứ {editingMember.generation} · id{" "}
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
              defaultValue={editingMember.life_status}
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
