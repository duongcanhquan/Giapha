import { redirect } from "next/navigation";

/** Tự tạo gia phả đã tắt — chuyển sang chờ duyệt / đăng ký */
export default function CreateFamilyPage() {
  redirect("/onboarding/pending");
}
