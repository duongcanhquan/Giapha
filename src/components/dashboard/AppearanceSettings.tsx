"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getFamily, updateFamilyAppearance } from "@/services/familyService";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { appToast } from "@/lib/toast";
import type { FamilyTheme } from "@/types/family";

type AppearanceSettingsProps = {
  familyId: string;
};

const DEFAULT_THEME: FamilyTheme = {
  background_image: "",
  primary_color: "#7a1f1f",
  accent_color: "#c9a227",
  surface_color: "#e9eef3",
};

export function AppearanceSettings({ familyId }: AppearanceSettingsProps) {
  const [theme, setTheme] = useState<FamilyTheme>(DEFAULT_THEME);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getFamily(familyId)
      .then((family) => {
        if (cancelled || !family?.settings.theme) return;
        setTheme({ ...DEFAULT_THEME, ...family.settings.theme });
      })
      .catch(() => {
        /* demo */
      });
    return () => {
      cancelled = true;
    };
  }, [familyId]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const next: FamilyTheme = {
      background_image: String(form.get("background_image") ?? "").trim() || null,
      primary_color: String(form.get("primary_color") ?? DEFAULT_THEME.primary_color),
      accent_color: String(form.get("accent_color") ?? DEFAULT_THEME.accent_color),
      surface_color: String(form.get("surface_color") ?? DEFAULT_THEME.surface_color),
    };
    setTheme(next);

    try {
      if (!isFirebaseConfigured()) {
        const msg = "Đã áp dụng xem trước cục bộ (demo). Cấu hình Firebase để lưu.";
        setMessage(msg);
        appToast.success("Giao diện (demo)", msg);
        return;
      }
      await updateFamilyAppearance(familyId, { theme: next });
      setMessage("Đã lưu giao diện dòng họ.");
      appToast.success("Đã lưu giao diện");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lưu thất bại.";
      setMessage(msg);
      appToast.error("Lưu giao diện thất bại", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-literata), Literata, Georgia, serif" }}
        >
          Thiết lập Giao diện
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Ảnh nền và màu sắc áp dụng cho trang cây công khai `/tree/{familyId}`.
        </p>
      </div>

      <form
        key={`${theme.primary_color}-${theme.accent_color}-${theme.surface_color}-${theme.background_image ?? ""}`}
        onSubmit={(e) => void onSubmit(e)}
        className="max-w-xl space-y-4 rounded-xl border border-stone-300/60 bg-[#fffdf8] p-4"
      >
        <label className="block text-sm font-semibold">
          Ảnh nền (URL)
          <input
            name="background_image"
            defaultValue={theme.background_image ?? ""}
            placeholder="https://…"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal"
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block text-sm font-semibold">
            Màu chính
            <input
              name="primary_color"
              type="color"
              defaultValue={theme.primary_color}
              className="mt-1 h-10 w-full cursor-pointer rounded border border-stone-300 bg-white"
            />
          </label>
          <label className="block text-sm font-semibold">
            Màu nhấn
            <input
              name="accent_color"
              type="color"
              defaultValue={theme.accent_color}
              className="mt-1 h-10 w-full cursor-pointer rounded border border-stone-300 bg-white"
            />
          </label>
          <label className="block text-sm font-semibold">
            Màu nền
            <input
              name="surface_color"
              type="color"
              defaultValue={theme.surface_color}
              className="mt-1 h-10 w-full cursor-pointer rounded border border-stone-300 bg-white"
            />
          </label>
        </div>

        <div
          className="overflow-hidden rounded-lg border border-stone-200"
          style={{ background: theme.surface_color }}
        >
          {theme.background_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={theme.background_image}
              alt="Xem trước nền"
              className="h-24 w-full object-cover"
            />
          ) : (
            <div className="h-24 bg-stone-200/80" />
          )}
          <div className="flex gap-2 p-3">
            <span
              className="rounded px-3 py-1 text-xs font-semibold text-white"
              style={{ background: theme.primary_color }}
            >
              CTA
            </span>
            <span
              className="rounded px-3 py-1 text-xs font-semibold text-[#1c1410]"
              style={{ background: theme.accent_color }}
            >
              Accent
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#7a1f1f] px-4 py-2 text-sm font-semibold text-[#fffdf8] disabled:opacity-60"
        >
          {saving ? "Đang lưu…" : "Lưu giao diện"}
        </button>
        {message ? <p className="text-sm text-[#7a1f1f]">{message}</p> : null}
      </form>
    </div>
  );
}
