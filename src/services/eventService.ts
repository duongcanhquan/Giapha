import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase/client";
import type {
  CreateFamilyEventInput,
  FamilyEvent,
  FamilyEventType,
  UpdateFamilyEventInput,
} from "@/types/events";
import type { FamilyMember } from "@/types/genealogy";
import { memberGeneration } from "@/types/genealogy";

const EVENTS = "family_events";

function eventsCol() {
  return collection(getDb(), EVENTS);
}

function timestampToIso(value: unknown): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "string") return value;
  return null;
}

function mapEvent(id: string, data: Record<string, unknown>): FamilyEvent {
  return {
    id,
    family_id: String(data.family_id ?? ""),
    title: String(data.title ?? ""),
    type: (data.type as FamilyEventType) ?? "khac",
    date: (data.date as string) ?? null,
    lunar_date: (data.lunar_date as string) ?? null,
    member_id: (data.member_id as string) ?? null,
    branch_id: (data.branch_id as string) ?? null,
    description: (data.description as string) ?? "",
    created_at: timestampToIso(data.created_at),
    created_by: (data.created_by as string) ?? null,
  };
}

export async function listFamilyEvents(
  familyId: string,
): Promise<FamilyEvent[]> {
  const q = query(eventsCol(), where("family_id", "==", familyId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => mapEvent(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => {
      const da = a.date ?? a.lunar_date ?? "";
      const db = b.date ?? b.lunar_date ?? "";
      return db.localeCompare(da);
    });
}

export async function createFamilyEvent(
  input: CreateFamilyEventInput,
): Promise<FamilyEvent> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Cần đăng nhập.");

  const title = input.title.trim();
  if (!title) throw new Error("Tiêu đề sự kiện không được trống.");

  const ref = await addDoc(eventsCol(), {
    family_id: input.family_id,
    title,
    type: input.type,
    date: input.date?.trim() || null,
    lunar_date: input.lunar_date?.trim() || null,
    member_id: input.member_id || null,
    branch_id: input.branch_id || null,
    description: (input.description ?? "").trim(),
    created_at: serverTimestamp(),
    created_by: user.uid,
    updated_at: serverTimestamp(),
  });

  return {
    id: ref.id,
    family_id: input.family_id,
    title,
    type: input.type,
    date: input.date?.trim() || null,
    lunar_date: input.lunar_date?.trim() || null,
    member_id: input.member_id || null,
    branch_id: input.branch_id || null,
    description: (input.description ?? "").trim(),
    created_at: new Date().toISOString(),
    created_by: user.uid,
  };
}

export async function updateFamilyEvent(
  eventId: string,
  input: UpdateFamilyEventInput,
): Promise<void> {
  const payload: Record<string, unknown> = {
    updated_at: serverTimestamp(),
  };
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.type !== undefined) payload.type = input.type;
  if (input.date !== undefined) payload.date = input.date?.trim() || null;
  if (input.lunar_date !== undefined) {
    payload.lunar_date = input.lunar_date?.trim() || null;
  }
  if (input.member_id !== undefined) payload.member_id = input.member_id || null;
  if (input.branch_id !== undefined) payload.branch_id = input.branch_id || null;
  if (input.description !== undefined) {
    payload.description = input.description.trim();
  }
  await updateDoc(doc(getDb(), EVENTS, eventId), payload);
}

export async function deleteFamilyEvent(eventId: string): Promise<void> {
  await deleteDoc(doc(getDb(), EVENTS, eventId));
}

/** Sinh sự kiện giỗ từ thành viên đã mất (chỉ hiển thị, không lưu). */
export function deriveGioEvents(members: FamilyMember[]): FamilyEvent[] {
  return members
    .filter(
      (m) =>
        !m.status.is_placeholder &&
        !m.status.is_alive &&
        (m.dates.lunar_death || m.dates.death),
    )
    .map((m) => ({
      id: `derived-gio-${m.id}`,
      family_id: m.family_id,
      title: `Giỗ ${m.full_name}`,
      type: "gio" as const,
      date: m.dates.death ?? null,
      lunar_date: m.dates.lunar_death ?? null,
      member_id: m.id,
      branch_id: m.tree_logic.branch_id,
      description: `Đời ${memberGeneration(m)} · tự động từ hồ sơ thành viên`,
      derived: true,
      created_at: null,
      created_by: null,
    }))
    .sort((a, b) =>
      (b.lunar_date ?? b.date ?? "").localeCompare(a.lunar_date ?? a.date ?? ""),
    );
}
