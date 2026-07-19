# Giapha

Nền tảng SaaS cây gia phả tiếng Việt — nhiều dòng họ, React Flow, Firebase Auth/Firestore.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- [`@xyflow/react`](https://reactflow.dev/) (React Flow v12)
- Framer Motion · Firebase Auth + Firestore · lunar-javascript · html2canvas/jspdf

## Collections (multi-tenant)

| Collection | Mô tả |
|------------|--------|
| `families` | `{ id, name, description, owner_id, created_at }` |
| `family_members` | Thành viên — **bắt buộc** `family_id` + `branch_id` |
| `family_relations` | Cạnh cha→con — có `family_id` + `branch_id` |
| `family_members/{id}/sensitive/contact` | SĐT/địa chỉ — không public |

## Security Rules

| Ai | Quyền |
|----|--------|
| Public | Read `families` + `family_members` / `family_relations` khi có `family_id` |
| Family Owner (`families.owner_id == auth.uid`) | Full CRUD mọi `family_members` của `family_id` đó |
| Branch Admin (claims `role`, `family_id`, `branch_id`) | Write khi `family_id` + `branch_id` khớp; delete chặn nếu `path.size() > 2` |

```bash
firebase deploy --only firestore:rules
```

## Onboarding

1. `/register` — Firebase Auth (email/password)
2. Tự chuyển `/onboarding/create-family`
3. Submit → tạo `families` (owner = UID) + seed Thủy tổ → `/cay?family_id=…`

## Chạy local

```bash
cp .env.example .env.local   # điền NEXT_PUBLIC_FIREBASE_*
npm install
npm run dev
```

| Route | Nội dung |
|-------|----------|
| `/` | Landing kể chuyện |
| `/register` · `/login` | Auth |
| `/onboarding/create-family` | Tạo gia phả (Admin dòng họ) |
| `/tree/[familyId]` | **Public** — FamilyTree read-only + Copy Link Chia Sẻ |
| `/dashboard/[familyId]` | **Admin** — Auth Guard (Owner / Branch Admin) |
| `/dashboard/[familyId]/members` | Quản lý thành viên |
| `/dashboard/[familyId]/branches` | Quản lý nhánh |
| `/dashboard/[familyId]/appearance` | Ảnh nền & màu sắc dòng họ |
| `/cay` | Bản demo nội bộ (legacy) |

## Services

```ts
import { createFamily } from "@/services/familyService";
import { addMember, addPlaceholderNode, updateMember } from "@/services/memberService";

await createFamily({ name: "Nguyễn", description: "…" });
await addMember({
  family_id: "…",
  full_name: "Nguyễn Văn A",
  parent_id: "founder-or-placeholder-id",
});
```

## FamilyTree & văn hóa

- Trace route, PlaceholderNode, ADOPTED dashed edges
- Double-click → Profile Modal (húy/thụy, tiểu sử, lịch giỗ âm)
- `ExportTreeButton` → PDF khổ A0

## Performance & UX

- **SWR** (`useFamilyTree`) — cache/revalidate theo `familyId`, không refetch khi đổi trang
- **React Flow** `onlyRenderVisibleElements` — virtualize nodes khi cây lớn
- **firestore.indexes.json** — composite `family_id` + `branch_id` + `path`
- **error.tsx** boundaries + skeleton shimmer + **sonner** toast (`appToast`)
- **Smart Search** (Fuse.js, bỏ dấu) → zoom/pan tới node
- Mobile mặc định Fit View vừa màn hình
