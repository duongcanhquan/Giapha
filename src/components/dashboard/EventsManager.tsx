"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { DashboardPanelSkeleton } from "@/components/ui/skeleton";
import { useFamilyTree } from "@/hooks/useFamilyTree";
import { appToast } from "@/lib/toast";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import {
  createFamilyEvent,
  deleteFamilyEvent,
  deriveGioEvents,
  listFamilyEvents,
} from "@/services/eventService";
import {
  EVENT_TYPE_LABEL,
  type FamilyEvent,
  type FamilyEventType,
} from "@/types/events";

type EventsManagerProps = {
  familyId: string;
};

export function EventsManager({ familyId }: EventsManagerProps) {
  const { tree, isLoading: treeLoading } = useFamilyTree(familyId);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [typeFilter, setTypeFilter] = useState<FamilyEventType | "all">("all");
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!isFirebaseConfigured()) {
      void Promise.resolve().then(() => {
        if (cancelled) return;
        setEvents([]);
        setLoading(false);
        setError("Firebase chưa cấu hình — chưa tải được sự kiện đã lưu.");
      });
      return () => {
        cancelled = true;
      };
    }

    void listFamilyEvents(familyId)
      .then((list) => {
        if (cancelled) return;
        setEvents(list);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Không tải được sự kiện.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [familyId, tick]);

  const derivedGio = useMemo(() => {
    const raw = deriveGioEvents(tree?.members ?? []);
    const claimed = new Set(
      events
        .filter((e) => e.type === "gio" && e.member_id)
        .map((e) => e.member_id as string),
    );
    return raw.filter((e) => !e.member_id || !claimed.has(e.member_id));
  }, [tree?.members, events]);

  const merged = useMemo(() => {
    const all = [...events, ...derivedGio];
    const needle = q.trim().toLowerCase();
    return all
      .filter((e) => {
        if (typeFilter !== "all" && e.type !== typeFilter) return false;
        if (!needle) return true;
        return (
          e.title.toLowerCase().includes(needle) ||
          (e.description ?? "").toLowerCase().includes(needle)
        );
      })
      .sort((a, b) =>
        (b.date ?? b.lunar_date ?? "").localeCompare(a.date ?? a.lunar_date ?? ""),
      );
  }, [events, derivedGio, typeFilter, q]);

  const members = useMemo(
    () =>
      (tree?.members ?? [])
        .filter((m) => !m.status.is_placeholder)
        .sort((a, b) => a.full_name.localeCompare(b.full_name, "vi")),
    [tree?.members],
  );

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const memberId = String(form.get("member_id") ?? "") || null;
    const linked = memberId
      ? members.find((m) => m.id === memberId) ?? null
      : null;

    try {
      await createFamilyEvent({
        family_id: familyId,
        title: String(form.get("title") ?? ""),
        type: String(form.get("type") ?? "khac") as FamilyEventType,
        date: String(form.get("date") ?? "") || null,
        lunar_date: String(form.get("lunar_date") ?? "") || null,
        member_id: memberId,
        branch_id: linked?.tree_logic.branch_id ?? null,
        description: String(form.get("description") ?? ""),
      });
      appToast.success("Đã thêm sự kiện");
      event.currentTarget.reset();
      setFormOpen(false);
      setTick((t) => t + 1);
    } catch (err) {
      appToast.error(
        "Thêm sự kiện thất bại",
        err instanceof Error ? err.message : "Lỗi không xác định",
      );
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (ev: FamilyEvent) => {
    if (ev.derived) return;
    if (!confirm(`Xoá sự kiện «${ev.title}»?`)) return;
    try {
      await deleteFamilyEvent(ev.id);
      appToast.success("Đã xoá sự kiện");
      setTick((t) => t + 1);
    } catch (err) {
      appToast.error(
        "Xoá thất bại",
        err instanceof Error ? err.message : "Lỗi không xác định",
      );
    }
  };

  if (treeLoading && loading) return <DashboardPanelSkeleton />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="gp-title text-2xl">Sự kiện dòng họ</h1>
          <p className="gp-lede mt-1 text-sm">
            {merged.length} sự kiện · giỗ từ hồ sơ thành viên hiện tự động; thêm
            cưới hỏi, họp họ khi cần.
          </p>
        </div>
        <button
          type="button"
          className="gp-btn gp-btn-primary"
          onClick={() => setFormOpen((v) => !v)}
        >
          {formOpen ? "Đóng form" : "+ Thêm sự kiện"}
        </button>
      </div>

      {formOpen ? (
        <form
          onSubmit={(e) => void onCreate(e)}
          className="gp-panel grid gap-3 p-5 sm:grid-cols-2"
        >
          <label className="gp-label sm:col-span-2">
            Tiêu đề
            <input
              name="title"
              required
              className="gp-input mt-1 font-normal"
              placeholder="VD: Họp họ đầu năm"
            />
          </label>
          <label className="gp-label">
            Loại
            <select
              name="type"
              className="gp-input mt-1 font-normal"
              defaultValue="hop_ho"
            >
              {(Object.keys(EVENT_TYPE_LABEL) as FamilyEventType[]).map((t) => (
                <option key={t} value={t}>
                  {EVENT_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="gp-label">
            Liên quan thành viên
            <select
              name="member_id"
              className="gp-input mt-1 font-normal"
              defaultValue=""
            >
              <option value="">—</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className="gp-label">
            Ngày dương
            <input name="date" type="date" className="gp-input mt-1 font-normal" />
          </label>
          <label className="gp-label">
            Ngày / giỗ âm
            <input
              name="lunar_date"
              className="gp-input mt-1 font-normal"
              placeholder="VD: 2024-3-15"
            />
          </label>
          <label className="gp-label sm:col-span-2">
            Ghi chú
            <textarea
              name="description"
              rows={2}
              className="gp-input mt-1 font-normal"
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="gp-btn gp-btn-primary disabled:opacity-60"
            >
              {saving ? "Đang lưu…" : "Lưu sự kiện"}
            </button>
            <button
              type="button"
              className="gp-btn gp-btn-ghost"
              onClick={() => setFormOpen(false)}
            >
              Huỷ
            </button>
          </div>
        </form>
      ) : null}

      <div className="gp-panel grid gap-3 p-4 sm:grid-cols-3">
        <label className="gp-label sm:col-span-2">
          Tìm sự kiện
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="gp-input mt-1 font-normal"
            placeholder="Tên sự kiện, ghi chú…"
          />
        </label>
        <label className="gp-label">
          Loại
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as typeof typeFilter)
            }
            className="gp-input mt-1 font-normal"
          >
            <option value="all">Tất cả</option>
            {(Object.keys(EVENT_TYPE_LABEL) as FamilyEventType[]).map((t) => (
              <option key={t} value={t}>
                {EVENT_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="rounded-[var(--gp-radius)] bg-[var(--gp-lacquer-soft)] px-3 py-2 text-sm text-[var(--gp-lacquer)]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--gp-muted)]">Đang tải sự kiện…</p>
      ) : (
        <ul className="space-y-2.5">
          {merged.map((ev) => (
            <li
              key={ev.id}
              className="rounded-xl border border-[var(--gp-scroll-edge)] bg-[var(--gp-scroll)] px-4 py-3.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-base font-semibold">
                      {ev.title}
                    </p>
                    <span className="rounded-full bg-[var(--gp-lacquer-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--gp-lacquer)]">
                      {EVENT_TYPE_LABEL[ev.type]}
                      {ev.derived ? " · tự động" : ""}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--gp-muted)]">
                    {ev.date ? `Dương: ${ev.date}` : null}
                    {ev.lunar_date
                      ? `${ev.date ? " · " : ""}Âm: ${ev.lunar_date}`
                      : null}
                    {!ev.date && !ev.lunar_date ? "Chưa có ngày" : null}
                  </p>
                  {ev.description ? (
                    <p className="mt-1.5 text-sm text-[var(--gp-ink)]/80">
                      {ev.description}
                    </p>
                  ) : null}
                </div>
                {!ev.derived ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-[var(--gp-lacquer)] hover:underline"
                    onClick={() => void onDelete(ev)}
                  >
                    Xoá
                  </button>
                ) : null}
              </div>
            </li>
          ))}
          {merged.length === 0 ? (
            <li className="rounded-xl border border-dashed border-[var(--gp-scroll-edge)] px-4 py-10 text-center text-sm text-[var(--gp-muted)]">
              Chưa có sự kiện khớp bộ lọc.
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
