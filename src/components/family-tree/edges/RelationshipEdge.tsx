"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import type { RelationshipType } from "@/types/genealogy";

export type EdgeKind = "BLOOD" | "ADOPTED" | "MARRIAGE" | "MOTHER";

export type RelationshipEdgeData = {
  relationshipType: RelationshipType;
  kind?: EdgeKind;
  label?: string;
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
  const kind =
    data?.kind ??
    (data?.relationshipType === "ADOPTED" ? "ADOPTED" : "BLOOD");
  const isMarriage = kind === "MARRIAGE";
  const isMother = kind === "MOTHER";
  const isAdopted = kind === "ADOPTED";

  const [edgePath, labelX, labelY] = isMarriage
    ? getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        curvature: 0.25,
      })
    : getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        borderRadius: 12,
      });

  const dimmed = Boolean(data?.dimmed);
  const highlighted = Boolean(data?.highlighted);

  let stroke = "var(--ft-edge-stroke)";
  let strokeWidth = 1.6;
  if (highlighted) {
    stroke = "var(--ft-path-stroke)";
    strokeWidth = 3;
  } else if (isMarriage) {
    stroke = "var(--ft-gold)";
    strokeWidth = 2;
  } else if (isMother) {
    stroke = "#8b6b8a";
    strokeWidth = 1.4;
  } else if (isAdopted) {
    strokeWidth = 2;
  }

  const opacity = dimmed ? 0.12 : isMother && !highlighted ? 0.65 : 1;
  const label = data?.label ?? (isAdopted ? "Con nuôi" : null);
  const showLabel =
    Boolean(label) && (highlighted || isMarriage || isMother || isAdopted);

  return (
    <>
      <g style={{ opacity, transition: "opacity 0.2s ease" }}>
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={isMarriage ? undefined : markerEnd}
          style={{
            stroke,
            strokeWidth,
            strokeDasharray:
              isAdopted || isMother
                ? isMother
                  ? "5 5"
                  : "8 6"
                : highlighted
                  ? "8 6"
                  : undefined,
          }}
          className={
            isAdopted || highlighted
              ? "ft-edge--adopted"
              : isMarriage
                ? "ft-edge--marriage"
                : isMother
                  ? "ft-edge--mother"
                  : undefined
          }
        />
      </g>
      {showLabel && label ? (
        <EdgeLabelRenderer>
          <div
            className={[
              "ft-edge-label",
              isMarriage ? "ft-edge-label--marriage" : "",
              isMother ? "ft-edge-label--mother" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              opacity,
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
