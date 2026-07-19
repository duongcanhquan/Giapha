"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import { motion } from "framer-motion";
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
  const kind = data?.kind ?? (data?.relationshipType === "ADOPTED" ? "ADOPTED" : "BLOOD");
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
  let strokeWidth = 1.8;
  if (highlighted) {
    stroke = "var(--ft-path-stroke)";
    strokeWidth = 3.2;
  } else if (isMarriage) {
    stroke = "var(--ft-gold)";
    strokeWidth = 2.2;
  } else if (isMother) {
    stroke = "#8b6b8a";
    strokeWidth = 1.6;
  } else if (isAdopted) {
    strokeWidth = 2.2;
  }

  const opacity = dimmed ? 0.15 : isMother && !highlighted ? 0.72 : 1;
  const label = data?.label ?? (isAdopted ? "Con nuôi" : null);
  const showLabel =
    Boolean(label) && (highlighted || isMarriage || isMother || isAdopted);

  return (
    <>
      <motion.g
        animate={{ opacity }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={isMarriage ? undefined : markerEnd}
          style={{
            stroke,
            strokeWidth,
            strokeDasharray:
              isAdopted || isMother || highlighted
                ? isMother
                  ? "5 5"
                  : "8 6"
                : isMarriage
                  ? "2 0"
                  : undefined,
            transition: "stroke 0.35s ease, stroke-width 0.35s ease",
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
      </motion.g>
      {showLabel && label ? (
        <EdgeLabelRenderer>
          <motion.div
            className={[
              "ft-edge-label",
              isMarriage ? "ft-edge-label--marriage" : "",
              isMother ? "ft-edge-label--mother" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            animate={{ opacity }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {label}
          </motion.div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
