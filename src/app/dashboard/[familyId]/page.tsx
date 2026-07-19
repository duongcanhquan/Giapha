import Link from "next/link";

type PageProps = {
  params: Promise<{ familyId: string }>;
};

export default async function DashboardHomePage({ params }: PageProps) {
  const { familyId: raw } = await params;
  const familyId = decodeURIComponent(raw);

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-literata), Literata, Georgia, serif" }}
        >
          Tổng quan quản trị
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Quản lý thành viên, nhánh và giao diện riêng của dòng họ. Khách xem tại{" "}
          <Link href={`/tree/${familyId}`} className="font-semibold text-[#7a1f1f] hover:underline">
            /tree/{familyId}
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            href: `/dashboard/${familyId}/members`,
            title: "Thành viên",
            body: "Thêm, sửa, xoá người trên cây (theo quyền Owner / Branch Admin).",
          },
          {
            href: `/dashboard/${familyId}/branches`,
            title: "Nhánh",
            body: "Đặt tên và mô tả các chi nhánh để phân quyền trưởng nhánh.",
          },
          {
            href: `/dashboard/${familyId}/appearance`,
            title: "Giao diện",
            body: "Đổi ảnh nền, màu chủ đạo và màu nhấn cho dòng họ.",
          },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border border-stone-300/60 bg-[#fffdf8] p-4 transition hover:border-[#7a1f1f]/40"
          >
            <h2 className="font-semibold text-[#1c1410]">{card.title}</h2>
            <p className="mt-2 text-sm text-stone-600">{card.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
