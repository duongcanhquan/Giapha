"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { ChevronDown, ChevronRight, Flame, Flower2, Heart } from "lucide-react";

export type NodeLifeStatus = "LIVING" | "DECEASED";

export type NodeSpouse = {
  id: string;
  full_name: string;
  life_status: NodeLifeStatus;
  is_placeholder?: boolean;
  role?: "DAU" | "RE" | "SPOUSE";
};

export type MemberNodeData = {
  memberId: string;
  fullName: string;
  generation: number;
  lifeStatus: NodeLifeStatus;
  isHuongHoa: boolean;
  spouses: NodeSpouse[];
  path: string[];
  dimmed?: boolean;
  highlighted?: boolean;
  branchLabel?: string;
  childCount?: number;
  hiddenDescendantCount?: number;
  collapsed?: boolean;
  onToggleCollapse?: (memberId: string) => void;
};

export type MemberFlowNode = Node<MemberNodeData, "member">;

function spouseRoleLabel(role?: NodeSpouse["role"]) {
  if (role === "DAU") return "Dâu";
  if (role === "RE") return "Rể";
  return "Phối ngẫu";
}

function SpouseChip({ spouse }: { spouse: NodeSpouse }) {
  const deceased = spouse.life_status === "DECEASED";
  return (
    <div
      className={`ft-spouse ${deceased ? "ft-spouse--deceased" : "ft-spouse--living"}`}
      title={`${spouse.full_name} · ${deceased ? "đã mất" : "đang sống"}`}
    >
      <span className="ft-spouse__label">
        {spouseRoleLabel(spouse.role)} · {deceased ? "đã mất" : "còn sống"}
      </span>
      <span className="ft-spouse__name">{spouse.full_name}</span>
    </div>
  );
}

export function MemberNode({ data }: NodeProps<MemberFlowNode>) {
  const deceased = data.lifeStatus === "DECEASED";
  const opacity = data.dimmed ? 0.18 : 1;
  const childCount = data.childCount ?? 0;
  const hidden = data.hiddenDescendantCount ?? 0;
  const canCollapse =
    childCount > 0 && typeof data.onToggleCollapse === "function";

  return (
    <div
      className={[
        "ft-member",
        deceased ? "ft-member--deceased" : "ft-member--living",
        data.highlighted ? "ft-member--highlighted" : "",
        data.isHuongHoa ? "ft-member--huong-hoa" : "",
        data.collapsed ? "ft-member--collapsed" : "",
        data.dimmed ? "ft-member--dimmed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ opacity }}
      data-life={deceased ? "deceased" : "living"}
      title={deceased ? "Đã mất" : "Đang sống"}
    >
      <span className="ft-member__lifebar" aria-hidden />
      <Handle type="target" position={Position.Top} className="ft-handle" />

      <div className="ft-member__stack">
        <div className="ft-member__main">
          <div className="ft-member__meta">
            <span className="ft-member__gen">Đời {data.generation}</span>
            {data.branchLabel ? (
              <span className="ft-member__branch" title={data.branchLabel}>
                {data.branchLabel}
              </span>
            ) : null}
            {data.isHuongHoa ? (
              <span className="ft-member__icon" title="Hương hỏa">
                <Flame size={13} aria-hidden />
                <span>Hương hỏa</span>
              </span>
            ) : null}
          </div>

          <p className="ft-member__name">{data.fullName}</p>

          <span
            className={`ft-member__status ${deceased ? "ft-member__status--deceased" : "ft-member__status--living"}`}
          >
            {deceased ? (
              <>
                <Flower2 size={13} aria-hidden />
                Đã mất
              </>
            ) : (
              <>
                <Heart size={13} aria-hidden />
                Còn sống
              </>
            )}
          </span>
        </div>

        {data.spouses.length > 0 ? (
          <div className="ft-member__spouses" aria-label="Vợ/chồng">
            {data.spouses.map((spouse) => (
              <SpouseChip key={spouse.id} spouse={spouse} />
            ))}
          </div>
        ) : null}

        {canCollapse ? (
          <button
            type="button"
            className="ft-member__collapse nodrag nopan"
            title={
              data.collapsed
                ? `Mở nhánh (${hidden || childCount} người đang ẩn)`
                : `Gom nhánh (${childCount} con)`
            }
            onClick={(e) => {
              e.stopPropagation();
              data.onToggleCollapse?.(data.memberId);
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {data.collapsed ? (
              <ChevronRight size={14} aria-hidden />
            ) : (
              <ChevronDown size={14} aria-hidden />
            )}
            <span>
              {data.collapsed
                ? `Mở nhánh · ${hidden || childCount} ẩn`
                : `Gom · ${childCount} con`}
            </span>
          </button>
        ) : null}
      </div>

      <Handle type="source" position={Position.Bottom} className="ft-handle" />
    </div>
  );
}
