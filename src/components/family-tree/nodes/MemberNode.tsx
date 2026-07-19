"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import { Flame, Flower2 } from "lucide-react";

export type NodeLifeStatus = "LIVING" | "DECEASED";

export type NodeSpouse = {
  id: string;
  full_name: string;
  life_status: NodeLifeStatus;
  is_placeholder?: boolean;
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
};

export type MemberFlowNode = Node<MemberNodeData, "member">;

function SpouseChip({ spouse }: { spouse: NodeSpouse }) {
  const deceased = spouse.life_status === "DECEASED";
  return (
    <div
      className={`ft-spouse ${deceased ? "ft-spouse--deceased" : "ft-spouse--living"}`}
      title={spouse.full_name}
    >
      <span className="ft-spouse__label">Phối ngẫu</span>
      <span className="ft-spouse__name">{spouse.full_name}</span>
    </div>
  );
}

export function MemberNode({ data }: NodeProps<MemberFlowNode>) {
  const deceased = data.lifeStatus === "DECEASED";
  const opacity = data.dimmed ? 0.2 : 1;

  return (
    <motion.div
      className={[
        "ft-member",
        deceased ? "ft-member--deceased" : "ft-member--living",
        data.highlighted ? "ft-member--highlighted" : "",
        data.isHuongHoa ? "ft-member--huong-hoa" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      animate={{ opacity }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Handle type="target" position={Position.Top} className="ft-handle" />

      <div className="ft-member__stack">
        <div className="ft-member__main">
          <div className="ft-member__meta">
            <span className="ft-member__gen">Đời thứ {data.generation}</span>
            {data.isHuongHoa ? (
              <span className="ft-member__icon" title="Hương hỏa">
                <Flame size={14} aria-hidden />
                <span>Hương hỏa</span>
              </span>
            ) : null}
            {deceased ? (
              <span className="ft-member__icon ft-member__icon--lotus" title="Đã mất">
                <Flower2 size={14} aria-hidden />
                <span>Đã mất</span>
              </span>
            ) : null}
          </div>
          <p className="ft-member__name">{data.fullName}</p>
        </div>

        {data.spouses.length > 0 ? (
          <div className="ft-member__spouses" aria-label="Vợ/chồng">
            {data.spouses.map((spouse) => (
              <SpouseChip key={spouse.id} spouse={spouse} />
            ))}
          </div>
        ) : null}
      </div>

      <Handle type="source" position={Position.Bottom} className="ft-handle" />
    </motion.div>
  );
}
