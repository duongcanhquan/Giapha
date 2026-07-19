"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { prepareAvatarBlob } from "@/lib/images/prepare-avatar";
import { appToast } from "@/lib/toast";
import { updateMember } from "@/services/memberService";
import { MemberAvatar } from "@/components/ui/MemberAvatar";

type MemberPhotoUploaderProps = {
  memberId: string;
  familyId: string;
  fullName: string;
  photoUrl?: string | null;
  deceased?: boolean;
  onChanged?: (photoUrl: string | null) => void;
};

async function authHeader(): Promise<string> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Bạn cần đăng nhập để tải ảnh.");
  const token = await user.getIdToken();
  return `Bearer ${token}`;
}

export function MemberPhotoUploader({
  memberId,
  familyId,
  fullName,
  photoUrl,
  deceased,
  onChanged,
}: MemberPhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(photoUrl ?? null);

  useEffect(() => {
    setPreview(photoUrl ?? null);
  }, [photoUrl, memberId]);

  const current = preview;

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const blob = await prepareAvatarBlob(file);
      const form = new FormData();
      form.append("file", blob, "avatar.jpg");
      form.append("memberId", memberId);
      form.append("familyId", familyId);

      const res = await fetch("/api/members/photo", {
        method: "POST",
        headers: { Authorization: await authHeader() },
        body: form,
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        photo_url?: string;
      };
      if (!res.ok || !data.photo_url) {
        throw new Error(data.error || "Upload thất bại.");
      }

      await updateMember(memberId, { photo_url: data.photo_url });
      setPreview(data.photo_url);
      onChanged?.(data.photo_url);
      appToast.success("Đã cập nhật ảnh đại diện");
    } catch (err) {
      appToast.error(
        "Không tải được ảnh",
        err instanceof Error ? err.message : "Thử lại sau.",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async () => {
    if (!current) return;
    if (!window.confirm("Xoá ảnh đại diện này?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/members/photo", {
        method: "DELETE",
        headers: {
          Authorization: await authHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ memberId, familyId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Xoá trên R2 thất bại.");
      }
      await updateMember(memberId, { photo_url: null });
      setPreview(null);
      onChanged?.(null);
      appToast.success("Đã xoá ảnh");
    } catch (err) {
      appToast.error(
        "Không xoá được ảnh",
        err instanceof Error ? err.message : "Thử lại sau.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-stone-200 bg-[#fffdf8] p-3">
      <MemberAvatar
        name={fullName}
        photoUrl={current}
        size="xl"
        deceased={deceased}
      />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-semibold text-[#1c1410]">Ảnh đại diện</p>
        <p className="text-xs text-stone-500">
          Tự cắt vuông + nén JPEG trước khi lưu R2. Hiển thị dạng tròn trên hồ
          sơ và cây.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" aria-hidden />
            ) : (
              <Camera size={16} aria-hidden />
            )}
            {current ? "Đổi ảnh" : "Chọn ảnh"}
          </button>
          {current ? (
            <button
              type="button"
              disabled={busy}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-[#7a1f1f] disabled:opacity-60"
              onClick={() => void remove()}
            >
              <Trash2 size={16} aria-hidden />
              Xoá
            </button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </div>
    </div>
  );
}
