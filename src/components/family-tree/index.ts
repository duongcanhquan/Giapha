export { FamilyTree, type FamilyTreeHandle, type FamilyTreeProps } from "./FamilyTree";
export { MemberNode, type MemberNodeData } from "./nodes/MemberNode";
export { PlaceholderNode, type PlaceholderNodeData } from "./nodes/PlaceholderNode";
export { RelationshipEdge, type RelationshipEdgeData } from "./edges/RelationshipEdge";
export { SmartSearch } from "./SmartSearch";
export {
  traceRoute,
  highlightPath,
  type PathHighlightResult,
} from "@/lib/genealogy/highlight-path";
