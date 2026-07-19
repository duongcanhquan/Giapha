"use client";

import { useEffect, useMemo, useState } from "react";
import { appToast } from "@/lib/toast";
import {
  approveRegistration,
  listRegistrations,
  rejectRegistration,
} from "@/services/registrationService";
import type { FamilyRegistration, RegistrationStatus } from "@/types/genealogy";

type FilterStatus = RegistrationStatus | "all";

export function RegistrationQueue() {
  const [rows, setRows] = useState<FamilyRegistration[]>([]);
  const [status, setStatus] = useState<FilterStatus>("pending");
  const [q, setQ] = useState("");
  const [onlyDupes, setOnlyDupes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void listRegistrations(status)
      .then((list) => {
        if (cancelled) return;
        setRows(list);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Không tải được hồ sơ.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, tick]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyDupes && !(r.duplicate_hints && r.duplicate_hints.length > 0)) {
        return false;
      }
      if (!needle) return true;
      const hay = [
        r.full_name,
        r.email,
        r.phone,
        r.family_surname,
        r.family_name,
        r.address,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q, onlyDupes]);

  const onApprove = async (id: string) => {
    if (!confirm("Duyệt hồ sơ này và tạo gia phả cho người đăng ký?")) return;
    setBusyId(id);
    try {
      const { familyId } = await approveRegistration(id);
      appToast.success("Đã duyệt", `Đã tạo gia phả ${familyId}`);
      setTick((t) => t + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Duyệt thất bại.";
      appToast.error("Duyệt thất bại", msg);
    } finally {
      setBusyId(null);
    }
  };

  const onReject = async (id: string) => {
    const reason = window.prompt("Lý do từ chối?", "Thông tin chưa đủ / trùng đăng ký");
    if (reason === null) return;
    setBusyId(id);
    try {
      await rejectRegistration(id, reason);
      appToast.success("Đã từ chối hồ sơ");
      setTick((t) => t + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Từ chối thất bại.";
      appToast.error("Từ chối thất bại", msg);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-[var(--gp-gold-bright)]">
            Hồ sơ đăng ký tạo gia phả
          </h2>
          <p className="mt-1 text-sm text-[var(--gp-seal-ink)]/65">
            Duyệt mới tạo families. Lọc trùng email / SĐT / họ / tên gia phả.
          </p>
        </div>
        <button
          type="button"
          className="gp-btn gp-btn-outline-light"
          onClick={() => {
            setLoading(true);
            setTick((t) => t + 1);
          }}
        >
          Làm mới
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="text-xs text-[var(--gp-seal-ink)]/70">
          Trạng thái
          <select
            value={status}
            onChange={(e) => {
              setLoading(true);
              setStatus(e.target.value as FilterStatus);
            }}
            className="ml-2 rounded border border-[var(--gp-gold)]/30 bg-black/30 px-2 py-1.5 text-sm text-[var(--gp-seal-ink)]"
          >
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
            <option value="all">Tất cả</option>
          </select>
        </label>
        <label className="min-w-[200px] flex-1 text-xs text-[var(--gp-seal-ink)]/70">
          Tìm nhanh
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tên, email, SĐT, họ, địa chỉ…"
            className="mt-1 w-full rounded border border-[var(--gp-gold)]/30 bg-black/30 px-2 py-1.5 text-sm text-[var(--gp-seal-ink)]"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--gp-seal-ink)]/80">
          <input
            type="checkbox"
            checked={onlyDupes}
            onChange={(e) => setOnlyDupes(e.target.checked)}
          />
          Chỉ hồ sơ có cảnh báo trùng
        </label>
      </div>

      {error ? (
        <p className="rounded border border-red-300/40 bg-red-950/40 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--gp-seal-ink)]/60">Đang tải…</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--gp-radius-lg)] border border-[var(--gp-gold)]/25 bg-[#2a1212]/80">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--gp-gold)]/20 text-xs uppercase tracking-[0.12em] text-[var(--gp-seal-ink)]/50">
              <tr>
                <th className="px-3 py-3 font-semibold">Người tạo</th>
                <th className="px-3 py-3 font-semibold">Liên hệ</th>
                <th className="px-3 py-3 font-semibold">Gia phả</th>
                <th className="px-3 py-3 font-semibold">Trùng</th>
                <th className="px-3 py-3 font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-[var(--gp-seal-ink)]/55">
                    Không có hồ sơ phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-white/5 align-top last:border-0 hover:bg-[var(--gp-gold)]/5"
                  >
                    <td className="px-3 py-3">
                      <p className="font-display font-semibold">{r.full_name}</p>
                      <p className="mt-0.5 text-xs text-[var(--gp-seal-ink)]/55">
                        {r.address}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--gp-gold-bright)]/70">
                        {r.status}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-xs text-[var(--gp-seal-ink)]/75">
                      <p>{r.email}</p>
                      <p className="mt-1">{r.phone}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold">Họ {r.family_surname}</p>
                      <p className="text-xs text-[var(--gp-seal-ink)]/70">
                        {r.family_name}
                      </p>
                      {r.description ? (
                        <p className="mt-1 text-xs text-[var(--gp-seal-ink)]/50">
                          {r.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {r.duplicate_hints && r.duplicate_hints.length > 0 ? (
                        <ul className="max-w-[220px] space-y-1 text-amber-200/90">
                          {r.duplicate_hints.map((h) => (
                            <li key={h}>• {h}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-[var(--gp-seal-ink)]/40">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {r.status === "pending" ? (
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            className="rounded bg-[var(--gp-seal)] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[var(--gp-lacquer)] disabled:opacity-50"
                            onClick={() => void onApprove(r.id)}
                          >
                            Duyệt & tạo
                          </button>
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            className="rounded border border-white/20 px-2.5 py-1 text-xs font-semibold hover:bg-white/10 disabled:opacity-50"
                            onClick={() => void onReject(r.id)}
                          >
                            Từ chối
                          </button>
                        </div>
                      ) : r.family_id ? (
                        <a
                          href={`/dashboard/${encodeURIComponent(r.family_id)}`}
                          className="text-xs font-semibold text-[var(--gp-gold-bright)] hover:underline"
                        >
                          Mở dashboard
                        </a>
                      ) : r.reject_reason ? (
                        <span className="text-xs text-red-200/80">{r.reject_reason}</span>
                      ) : (
                        <span className="text-[var(--gp-seal-ink)]/40">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
