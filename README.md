# Giapha

Nền tảng SaaS cây gia phả tiếng Việt — multi-tenant, Next.js App Router, Tailwind, Firebase.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- [`@xyflow/react`](https://reactflow.dev/) · Framer Motion · SWR · Fuse.js
- Firebase Auth + Firestore · lunar-javascript · html2canvas/jspdf

## Schema (`src/types/genealogy.ts`)

| Collection | Fields |
|------------|--------|
| `families` | `id, name, owner_id, created_at, settings` |
| `family_members` | `id, family_id, full_name, traditional_names { birth, courtesy, posthumous }, status { is_alive, is_placeholder }, dates { birth, death, lunar_death }, tree_logic { parent_id, path, branch_id, relationship_type }, spouses` |
| `family_relations` | cạnh React Flow |
| `…/sensitive/contact` | SĐT/địa chỉ (không public) |

## Security Rules

| Ai | Quyền |
|----|--------|
| Public | Read khi document có `family_id` |
| Family Owner | Write theo `families.owner_id` |
| Branch Admin | Write khi `family_id` + `tree_logic.branch_id` khớp claims |
| Super Admin | `request.auth.token.role == 'super_admin'` — full R/W |

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Super Admin (one-shot)

```bash
export FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccount.json
npm run admin:create-super
```

Tạo `duongcanhquan@admin.local` / `123456` với claim `{ role: 'super_admin' }`.

## Onboarding

1. `/register` → Auth  
2. `/onboarding/create-family` → tạo `families` + seed Thủy tổ  
3. `/dashboard/[familyId]`

## Chạy local

```bash
cp .env.example .env.local
npm install
npm run dev
```

| Route | Vai trò |
|-------|---------|
| `/tree/[familyId]` | Khách — read-only + share link |
| `/dashboard/[familyId]` | Admin (Owner / Branch / Super) |
| `/tree/family-demo-nguyen` | Demo không Firebase |
