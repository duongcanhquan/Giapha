"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type PlaceholderNodeData = {
  memberId: string;
  generation: number;
  path: string[];
  dimmed?: boolean;
  highlighted?: boolean;
  readOnly?: boolean;
  onOpenUpdate?: (memberId: string) => void;
};

export type PlaceholderFlowNode = Node<PlaceholderNodeData, "placeholder">;

export function PlaceholderNode({ data }: NodeProps<PlaceholderFlowNode>) {
  const opacity = data.dimmed ? 0.14 : 0.55;
  const canEdit = !data.readOnly && Boolean(data.onOpenUpdate);

  return (
    <div
      className={[
        "ft-placeholder",
        data.highlighted ? "ft-placeholder--highlighted" : "",
        canEdit ? "" : "ft-placeholder--readonly",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ opacity }}
      role={canEdit ? "button" : "group"}
      tabIndex={canEdit ? 0 : -1}
      onClick={() => {
        if (canEdit) data.onOpenUpdate?.(data.memberId);
      }}
      onKeyDown={(event) => {
        if (!canEdit) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          data.onOpenUpdate?.(data.memberId);
        }
      }}
      title={canEdit ? "Cập nhật thông tin khuyết danh" : "Khuyết danh"}
    >
      <Handle type="target" position={Position.Top} className="ft-handle" />
      <span className="ft-placeholder__gen">Đời thứ {data.generation}</span>
      <p className="ft-placeholder__label">? Khuyết danh</p>
      {canEdit ? (
        <span className="ft-placeholder__hint">Nhấn để cập nhật</span>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="ft-handle" />
    </div>
  );
}
