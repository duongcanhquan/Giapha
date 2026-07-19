"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import { motion } from "framer-motion";
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
  const [edgePath, labelX, labelY] = getSmoothStepPath({
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

  const stroke = highlighted
    ? "var(--ft-path-stroke)"
    : "var(--ft-edge-stroke)";
  const strokeWidth = highlighted ? 3.4 : isAdopted ? 2.2 : 1.8;
  const opacity = dimmed ? 0.2 : 1;

  return (
    <>
      <motion.g
        animate={{ opacity }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          style={{
            stroke,
            strokeWidth,
            strokeDasharray: isAdopted || highlighted ? "8 6" : undefined,
            transition: "stroke 0.35s ease, stroke-width 0.35s ease",
          }}
          className={
            isAdopted || highlighted ? "ft-edge--adopted" : undefined
          }
        />
      </motion.g>
      {isAdopted ? (
        <EdgeLabelRenderer>
          <motion.div
            className="ft-edge-label"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            animate={{ opacity }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            Con nuôi
          </motion.div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
