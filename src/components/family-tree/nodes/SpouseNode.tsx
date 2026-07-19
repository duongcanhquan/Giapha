"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Flower2, Heart, HeartHandshake } from "lucide-react";
import type { SpouseRole } from "@/types/genealogy";
import type { NodeLifeStatus } from "./MemberNode";

export type SpouseNodeData = {
  spouseId: string;
  fullName: string;
  role: SpouseRole;
  lifeStatus: NodeLifeStatus;
  maidenName?: string | null;
  hometown?: string | null;
  notes?: string | null;
  birth?: string | null;
  death?: string | null;
  partnerId: string;
  partnerName: string;
  generation: number;
  branchLabel?: string;
  dimmed?: boolean;
  highlighted?: boolean;
};

export type SpouseFlowNode = Node<SpouseNodeData, "spouse">;

function roleTitle(role: SpouseRole) {
  if (role === "DAU") return "Con dâu";
  if (role === "RE") return "Con rể";
  return "Phối ngẫu";
}

function roleHint(role: SpouseRole, partnerName: string) {
  if (role === "DAU") return `Vợ của ${partnerName}`;
  if (role === "RE") return `Chồng của ${partnerName}`;
  return `Phối ngẫu của ${partnerName}`;
}

export function SpouseNode({ data }: NodeProps<SpouseFlowNode>) {
  const deceased = data.lifeStatus === "DECEASED";
  const opacity = data.dimmed ? 0.18 : 1;

  return (
    <div
      className={[
        "ft-spouse-node",
        deceased ? "ft-spouse-node--deceased" : "ft-spouse-node--living",
        data.role === "DAU" ? "ft-spouse-node--dau" : "",
        data.role === "RE" ? "ft-spouse-node--re" : "",
        data.highlighted ? "ft-spouse-node--highlighted" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ opacity }}
      title={roleHint(data.role, data.partnerName)}
      data-role={data.role}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="marriage"
        className="ft-handle"
      />
      <Handle type="target" position={Position.Top} id="top" className="ft-handle" />

      <div className="ft-spouse-node__badge">
        <HeartHandshake size={12} aria-hidden />
        {roleTitle(data.role)}
      </div>

      <p className="ft-spouse-node__name">{data.fullName}</p>

      {data.maidenName ? (
        <p className="ft-spouse-node__meta">Họ gốc: {data.maidenName}</p>
      ) : null}

      <p className="ft-spouse-node__relation">
        {roleHint(data.role, data.partnerName)}
      </p>

      <span
        className={`ft-member__status ${deceased ? "ft-member__status--deceased" : "ft-member__status--living"}`}
      >
        {deceased ? (
          <>
            <Flower2 size={12} aria-hidden />
            Đã mất
          </>
        ) : (
          <>
            <Heart size={12} aria-hidden />
            Còn sống
          </>
        )}
      </span>

      <div className="ft-spouse-node__gen">Đời {data.generation}</div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="child"
        className="ft-handle"
      />
    </div>
  );
}
