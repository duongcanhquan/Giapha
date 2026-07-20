"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";

export type GenerationLabelNodeData = {
  generation: number;
  label: string;
  branchHint?: string | null;
};

function GenerationLabelNodeComponent({
  data,
}: NodeProps & { data: GenerationLabelNodeData }) {
  return (
    <div className="ft-gen-label" aria-hidden>
      <span className="ft-gen-label__badge">{data.label}</span>
      {data.branchHint ? (
        <span className="ft-gen-label__hint">{data.branchHint}</span>
      ) : null}
    </div>
  );
}

export const GenerationLabelNode = memo(GenerationLabelNodeComponent);
