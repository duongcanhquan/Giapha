# Giapha

Ứng dụng cây gia phả tiếng Việt — Phase 1 (types) + Phase 2 (React Flow `FamilyTree`).

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- [`@xyflow/react`](https://reactflow.dev/) (React Flow v12)
- Framer Motion (fade / highlight)
- Lucide icons (hương hỏa, hoa sen)

## Cấu trúc chính

| Path | Mô tả |
|------|--------|
| `src/types/genealogy.ts` | Type Phase 1: `FamilyMember`, `FamilyRelation`, `path`, `is_placeholder`, … |
| `src/components/family-tree/` | `FamilyTree`, `MemberNode`, `PlaceholderNode`, `RelationshipEdge` |
| `src/lib/genealogy/build-flow.ts` | Layout + `extractPathIds` / highlight helpers |
| `src/data/sample-family.ts` | Dữ liệu mẫu để demo |

## Chạy local

```bash
npm install
npm run dev
```

## FamilyTree API

```tsx
const ref = useRef<FamilyTreeHandle>(null);

<FamilyTree
  ref={ref}
  data={familyTreeData}
  onPlaceholderUpdate={(payload) => { /* ... */ }}
/>

ref.current?.highlightPath("member-id"); // mờ node/edge ngoài path, tô đỏ/vàng đường Thủy tổ → target, center camera
ref.current?.clearHighlight();
```

### Custom nodes & edges

- **MemberNode** — tên, đời thứ N, icon hương hỏa; đang sống (viền sáng) / đã mất (nền đồng + hoa sen); spouses cạnh người chính.
- **PlaceholderNode** — `is_placeholder === true`: viền dashed, opacity 0.5, `? Khuyết danh`, click mở form cập nhật.
- **RelationshipEdge** — `relationship_type === 'ADOPTED'`: nét đứt animated.
