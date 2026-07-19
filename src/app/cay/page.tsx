import { redirect } from "next/navigation";

/** Trang demo cũ đã gỡ — đưa về trang chủ */
export default function CayRedirectPage() {
  redirect("/");
}
