# Giapha

Ứng dụng cây gia phả tiếng Việt — types, React Flow `FamilyTree`, Firebase Rules & Services.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- [`@xyflow/react`](https://reactflow.dev/) (React Flow v12)
- Framer Motion (fade / highlight)
- Firebase Auth + Firestore
- Lucide icons (hương hỏa, hoa sen)

## Cấu trúc chính

| Path | Mô tả |
|------|--------|
| `src/types/genealogy.ts` | Types: `FamilyMember`, `tree_logic`, `path`, `MemberContact`, … |
| `src/components/family-tree/` | `FamilyTree`, `MemberNode`, `PlaceholderNode`, `RelationshipEdge` |
| `src/services/memberService.ts` | CRUD: `addMember`, `updateMember`, `addPlaceholderNode` |
| `firestore.rules` | Security Rules (guest / super_admin / branch_admin) |
| `src/lib/firebase/client.ts` | Firebase client init |
| `src/data/sample-family.ts` | Dữ liệu mẫu để demo |

## Chạy local

```bash
npm install
npm run dev
```

- `/` — landing kể chuyện dòng họ (scroll timeline)
- `/cay` — cây gia phả, Profile Modal (double-click), xuất PDF A0

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

## Firebase Security & Services

### Roles (custom claims)

| Claim | Quyền |
|-------|--------|
| *(chưa login)* | Read document `members` công khai (tên, sinh tử, `tree_logic`, `path`). **Không** đọc `members/{id}/sensitive/contact`. |
| `role == 'super_admin'` | Full Read/Write |
| `role == 'branch_admin'` | Create/Update khi `tree_logic.branch_id == managed_branch_id`. Delete bị chặn nếu `path.size() > 2`. |

Deploy rules:

```bash
firebase deploy --only firestore:rules
```

### memberService

```ts
import { addMember, updateMember, addPlaceholderNode } from "@/services/memberService";

// path = parent.path + [newId] — kể cả khi parent là PlaceholderNode
await addMember({ full_name: "Nguyễn Văn A", parent_id: "parent-or-placeholder-id" });
await addPlaceholderNode({ parent_id: "parent-id" });
await updateMember("id", { full_name: "Tên mới", contact: { phone: "..." } });
```

Copy `.env.example` → `.env.local` và điền Firebase config.

## Trải nghiệm văn hóa

- **Profile Modal** (shadcn Dialog): double-click node → tên húy/thụy, tiểu sử, form tính ngày giỗ.
- **Âm lịch**: `src/lib/lunar/death-date.ts` dùng `lunar-javascript` dịch `death_date` → `lunar_death_date`.
- **Xuất in ấn**: `ExportTreeButton` clone cây, ẩn control/minimap/grid, xuất PDF khổ A0 (`html2canvas` + `jspdf`).
