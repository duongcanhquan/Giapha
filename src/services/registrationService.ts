import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentReference,
} from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase/client";
import { stripVietnameseDiacritics } from "@/lib/search/normalize";
import { createFamilyForOwner } from "@/services/familyService";
import { registerWithEmail } from "@/services/authService";
import { upsertFamilyStaff } from "@/services/staffService";
import type {
  FamilyRegistration,
  RegistrationStatus,
  SubmitFamilyRegistrationInput,
} from "@/types/genealogy";

const REGISTRATIONS = "family_registrations";
const LOOKUP_KEYS = "registration_keys";

function regsCol() {
  return collection(getDb(), REGISTRATIONS);
}

function regRef(id: string): DocumentReference {
  return doc(getDb(), REGISTRATIONS, id);
}

function lookupRef(kind: "email" | "phone", value: string) {
  return doc(getDb(), LOOKUP_KEYS, `${kind}_${value}`);
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function normalizeKey(value: string): string {
  return stripVietnameseDiacritics(value).replace(/\s+/g, " ").trim();
}

function mapRegistration(
  id: string,
  data: Record<string, unknown>,
): FamilyRegistration {
  return {
    id,
    applicant_uid: String(data.applicant_uid ?? ""),
    full_name: String(data.full_name ?? ""),
    family_surname: String(data.family_surname ?? ""),
    email: String(data.email ?? ""),
    phone: String(data.phone ?? ""),
    address: String(data.address ?? ""),
    family_name: String(data.family_name ?? ""),
    description: (data.description as string) ?? "",
    status: (data.status as RegistrationStatus) ?? "pending",
    norm_email: String(data.norm_email ?? ""),
    norm_phone: String(data.norm_phone ?? ""),
    norm_surname: String(data.norm_surname ?? ""),
    norm_family_name: String(data.norm_family_name ?? ""),
    created_at:
      data.created_at &&
      typeof data.created_at === "object" &&
      "toDate" in data.created_at
        ? (data.created_at as { toDate: () => Date }).toDate().toISOString()
        : (data.created_at as string) ?? null,
    reviewed_at:
      data.reviewed_at &&
      typeof data.reviewed_at === "object" &&
      "toDate" in data.reviewed_at
        ? (data.reviewed_at as { toDate: () => Date }).toDate().toISOString()
        : (data.reviewed_at as string) ?? null,
    reviewed_by: (data.reviewed_by as string) ?? null,
    reject_reason: (data.reject_reason as string) ?? null,
    family_id: (data.family_id as string) ?? null,
    duplicate_hints: (data.duplicate_hints as string[]) ?? [],
  };
}

/** Tra cứu khoá công khai email/SĐT + (nếu có quyền) quét họ/tên gia phả */
export async function findRegistrationDuplicates(input: {
  email: string;
  phone: string;
  family_surname: string;
  family_name: string;
  excludeId?: string;
}): Promise<string[]> {
  const hints: string[] = [];
  const normEmail = normalizeKey(input.email);
  const normPhone = normalizePhone(input.phone);
  const normSurname = normalizeKey(input.family_surname);
  const normFamily = normalizeKey(input.family_name);

  if (normEmail) {
    const emailSnap = await getDoc(lookupRef("email", normEmail));
    if (emailSnap.exists()) {
      const data = emailSnap.data() as Record<string, unknown>;
      const status = String(data.status ?? "pending");
      if (status !== "rejected" && data.registration_id !== input.excludeId) {
        hints.push(`Trùng email với hồ sơ ${status}`);
      }
    }
  }

  if (normPhone) {
    const phoneSnap = await getDoc(lookupRef("phone", normPhone));
    if (phoneSnap.exists()) {
      const data = phoneSnap.data() as Record<string, unknown>;
      const status = String(data.status ?? "pending");
      if (status !== "rejected" && data.registration_id !== input.excludeId) {
        hints.push(`Trùng SĐT với hồ sơ ${status}`);
      }
    }
  }

  // Soft filters (họ / tên gia phả) — Super Admin hoặc user đã login có quyền list
  try {
    const snap = await getDocs(regsCol());
    for (const d of snap.docs) {
      if (input.excludeId && d.id === input.excludeId) continue;
      const r = mapRegistration(d.id, d.data() as Record<string, unknown>);
      if (r.status === "rejected") continue;
      if (normSurname && r.norm_surname === normSurname) {
        hints.push(`Trùng họ dòng họ với hồ sơ ${r.status}: ${r.family_surname}`);
      }
      if (normFamily && r.norm_family_name === normFamily) {
        hints.push(`Trùng tên gia phả với hồ sơ ${r.status}: ${r.family_name}`);
      }
    }
  } catch {
    /* applicant chưa đọc được toàn bộ collection — bỏ soft filter */
  }

  return [...new Set(hints)];
}

async function writeLookupKeys(
  registrationId: string,
  normEmail: string,
  normPhone: string,
  status: RegistrationStatus,
): Promise<void> {
  const payload = {
    registration_id: registrationId,
    status,
    updated_at: serverTimestamp(),
  };
  await setDoc(lookupRef("email", normEmail), payload);
  if (normPhone) {
    await setDoc(lookupRef("phone", normPhone), payload);
  }
}

/**
 * Đăng ký tài khoản + gửi hồ sơ tạo gia phả (status=pending).
 * Không tạo `families` cho đến khi Super Admin duyệt.
 */
export async function submitFamilyRegistration(
  input: SubmitFamilyRegistrationInput,
): Promise<{ registration: FamilyRegistration; duplicates: string[] }> {
  const full_name = input.full_name.trim();
  const family_surname = input.family_surname.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const address = input.address.trim();
  const family_name = input.family_name.trim();

  if (!full_name || !family_surname || !email || !phone || !address || !family_name) {
    throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc.");
  }
  if (normalizePhone(phone).length < 9) {
    throw new Error("Số điện thoại không hợp lệ.");
  }

  const duplicates = await findRegistrationDuplicates({
    email,
    phone,
    family_surname,
    family_name,
  });

  // Chặn cứng trùng email / SĐT đã approved hoặc đang pending
  const hardBlock = duplicates.some(
    (h) => h.includes("Trùng email") || h.includes("Trùng SĐT"),
  );
  if (hardBlock) {
    throw new Error(
      "Email hoặc số điện thoại đã được đăng ký. Vui lòng đăng nhập hoặc liên hệ Super Admin.",
    );
  }

  await registerWithEmail({
    email,
    password: input.password,
    displayName: full_name,
  });

  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Đăng ký Auth thất bại.");

  const norm_email = normalizeKey(email);
  const norm_phone = normalizePhone(phone);
  const ref = doc(regsCol());
  const payload = {
    applicant_uid: user.uid,
    full_name,
    family_surname,
    email,
    phone,
    address,
    family_name,
    description: (input.description ?? "").trim(),
    status: "pending" as const,
    norm_email,
    norm_phone,
    norm_surname: normalizeKey(family_surname),
    norm_family_name: normalizeKey(family_name),
    created_at: serverTimestamp(),
    reviewed_at: null,
    reviewed_by: null,
    reject_reason: null,
    family_id: null,
    duplicate_hints: duplicates,
  };

  await setDoc(ref, payload);
  await writeLookupKeys(ref.id, norm_email, norm_phone, "pending");

  const registration = mapRegistration(ref.id, {
    ...payload,
    created_at: new Date().toISOString(),
  });

  return { registration, duplicates };
}

export async function getMyRegistrations(
  uid?: string,
): Promise<FamilyRegistration[]> {
  const applicant = uid ?? getFirebaseAuth().currentUser?.uid;
  if (!applicant) return [];
  const q = query(regsCol(), where("applicant_uid", "==", applicant));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => mapRegistration(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
}

export async function listRegistrations(
  status?: RegistrationStatus | "all",
): Promise<FamilyRegistration[]> {
  const snap = await getDocs(regsCol());
  let list = snap.docs.map((d) =>
    mapRegistration(d.id, d.data() as Record<string, unknown>),
  );
  if (status && status !== "all") {
    list = list.filter((r) => r.status === status);
  }
  return list.sort((a, b) =>
    (b.created_at ?? "").localeCompare(a.created_at ?? ""),
  );
}

export async function approveRegistration(
  registrationId: string,
): Promise<{ familyId: string }> {
  const admin = getFirebaseAuth().currentUser;
  if (!admin) throw new Error("Cần đăng nhập Super Admin.");

  const ref = regRef(registrationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Không tìm thấy hồ sơ đăng ký.");

  const reg = mapRegistration(snap.id, snap.data() as Record<string, unknown>);
  if (reg.status !== "pending") {
    throw new Error(`Hồ sơ đang ở trạng thái «${reg.status}», không duyệt được.`);
  }

  const duplicates = await findRegistrationDuplicates({
    email: reg.email,
    phone: reg.phone,
    family_surname: reg.family_surname,
    family_name: reg.family_name,
    excludeId: reg.id,
  });
  const hard = duplicates.some(
    (h) => h.includes("Trùng email") || h.includes("Trùng SĐT"),
  );
  if (hard) {
    throw new Error(
      `Không duyệt được do trùng: ${duplicates.filter((d) => d.includes("Trùng email") || d.includes("Trùng SĐT")).join("; ")}`,
    );
  }

  const family = await createFamilyForOwner(reg.applicant_uid, {
    name: reg.family_name,
    description:
      reg.description ||
      `Gia phả họ ${reg.family_surname} — người tạo: ${reg.full_name}`,
  });

  await upsertFamilyStaff({
    familyId: family.id,
    uid: reg.applicant_uid,
    email: reg.email,
    display_name: reg.full_name,
    role: "truong_ho",
    branch_id: null,
  });

  await updateDoc(ref, {
    status: "approved",
    family_id: family.id,
    reviewed_at: serverTimestamp(),
    reviewed_by: admin.uid,
    reject_reason: null,
    duplicate_hints: duplicates,
  });

  await writeLookupKeys(
    reg.id,
    reg.norm_email || normalizeKey(reg.email),
    reg.norm_phone || normalizePhone(reg.phone),
    "approved",
  );

  return { familyId: family.id };
}

export async function rejectRegistration(
  registrationId: string,
  reason: string,
): Promise<void> {
  const admin = getFirebaseAuth().currentUser;
  if (!admin) throw new Error("Cần đăng nhập Super Admin.");

  const ref = regRef(registrationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Không tìm thấy hồ sơ đăng ký.");

  const reg = mapRegistration(snap.id, snap.data() as Record<string, unknown>);
  if (reg.status !== "pending") {
    throw new Error("Chỉ từ chối được hồ sơ đang chờ duyệt.");
  }

  await updateDoc(ref, {
    status: "rejected",
    reject_reason: reason.trim() || "Không đủ điều kiện",
    reviewed_at: serverTimestamp(),
    reviewed_by: admin.uid,
  });

  await writeLookupKeys(
    reg.id,
    reg.norm_email || normalizeKey(reg.email),
    reg.norm_phone || normalizePhone(reg.phone),
    "rejected",
  );
}
