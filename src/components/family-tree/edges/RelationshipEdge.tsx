"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import type { RelationshipType } from "@/types/genealogy";

export type RelationshipEdgeData = {
  relationshipType: RelationshipType;
  dimmed?: boolean;
  highlighted?: boolean;
};

export type RelationshipFlowEdge = Edge<RelationshipEdgeData, "relationship">;

export function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<RelationshipFlowEdge>) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });

  const isAdopted = data?.relationshipType === "ADOPTED";
  const dimmed = Boolean(data?.dimmed);
  const highlighted = Boolean(data?.highlighted);

  const stroke = highlighted ? "var(--ft-path-stroke)" : "var(--ft-edge-stroke)";
  const strokeWidth = highlighted ? 3.2 : isAdopted ? 2.2 : 1.8;
  const opacity = dimmed ? 0.2 : 1;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke,
          strokeWidth,
          opacity,
          strokeDasharray: isAdopted ? "8 6" : undefined,
          transition: "opacity 0.35s ease, stroke 0.35s ease, stroke-width 0.35s ease",
        }}
        className={isAdopted ? "ft-edge--adopted" : undefined}
      />
      {isAdopted ? (
        <EdgeLabelRenderer>
          <div
            className="ft-edge-label"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              opacity,
            }}
          >
            Con nuôi
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
