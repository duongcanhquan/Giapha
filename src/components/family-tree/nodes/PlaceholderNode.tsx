"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";

export type PlaceholderNodeData = {
  memberId: string;
  generation: number;
  path: string[];
  dimmed?: boolean;
  highlighted?: boolean;
  onOpenUpdate?: (memberId: string) => void;
};

export type PlaceholderFlowNode = Node<PlaceholderNodeData, "placeholder">;

export function PlaceholderNode({ data }: NodeProps<PlaceholderFlowNode>) {
  const opacity = data.dimmed ? 0.2 : 0.5;

  return (
    <motion.div
      className={[
        "ft-placeholder",
        data.highlighted ? "ft-placeholder--highlighted" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      animate={{ opacity }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      role="button"
      tabIndex={0}
      onClick={() => data.onOpenUpdate?.(data.memberId)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          data.onOpenUpdate?.(data.memberId);
        }
      }}
      title="Cập nhật thông tin khuyết danh"
    >
      <Handle type="target" position={Position.Top} className="ft-handle" />
      <span className="ft-placeholder__gen">Đời thứ {data.generation}</span>
      <p className="ft-placeholder__label">? Khuyết danh</p>
      <span className="ft-placeholder__hint">Nhấn để cập nhật</span>
      <Handle type="source" position={Position.Bottom} className="ft-handle" />
    </motion.div>
  );
}
