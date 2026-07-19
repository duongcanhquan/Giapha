# Gia phả

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
| `/` | Landing — đăng nhập / đăng ký (không có tra cứu cây chung) |
| `/login` · `/register` | Vào đúng gia phả nhà mình hoặc tạo mới |
| `/dashboard/[familyId]` | Admin — sau đăng nhập |
| `/tree/[familyId]` | Chỉ mở khi có link chủ họ copy gửi |

## Deploy (Vercel)

Project GitHub: `duongcanhquan/Giapha` → team project **giapha** (`apcs-projects-f1bac39d`).

- Production alias: `https://giapha-apcs-projects-f1bac39d.vercel.app`
- `vercel.json` pin framework Next.js tại root repo

### Lỗi `404: NOT_FOUND` (Code: NOT_FOUND)

Thường **không phải lỗi Next.js**, mà do:

1. **Deployment Protection (Vercel Authentication)** đang bật → khách chưa login Vercel bị chặn / thấy NOT_FOUND.  
   Sửa: Vercel → Project **giapha** → **Settings → Deployment Protection** → tắt *Vercel Authentication* cho **Production** (và Preview nếu cần public).
2. Mở URL deployment cũ / hash đã hết hạn.
3. Domain `giapha.vercel.app` đang trỏ project **cũ** (ANS Team login) — không phải repo này. Gắn domain vào project mới tại **Settings → Domains**.
