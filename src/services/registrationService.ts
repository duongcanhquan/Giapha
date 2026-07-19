import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentReference,
} from "firebase/firestore";
import { updateProfile, type User } from "firebase/auth";
import { getDb, getFirebaseAuth } from "@/lib/firebase/client";
import {
  normalizeKey,
  normalizePhone,
} from "@/lib/registration/normalize";
import { createFamilyForOwner } from "@/services/familyService";
import { registerWithEmail } from "@/services/authService";
import { upsertFamilyStaff } from "@/services/staffService";
import type {
  FamilyRegistration,
  RegistrationStatus,
  SubmitFamilyRegistrationInput,
} from "@/types/genealogy";

export { normalizeKey, normalizePhone } from "@/lib/registration/normalize";

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

function isHardDuplicateHint(hint: string): boolean {
  return hint.includes("Trùng email") || hint.includes("Trùng SĐT");
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
      const regId = String(data.registration_id ?? "");
      if (status !== "rejected" && regId !== (input.excludeId ?? "")) {
        hints.push(`Trùng email với hồ sơ ${status}`);
      }
    }
  }

  if (normPhone) {
    const phoneSnap = await getDoc(lookupRef("phone", normPhone));
    if (phoneSnap.exists()) {
      const data = phoneSnap.data() as Record<string, unknown>;
      const status = String(data.status ?? "pending");
      const regId = String(data.registration_id ?? "");
      if (status !== "rejected" && regId !== (input.excludeId ?? "")) {
        hints.push(`Trùng SĐT với hồ sơ ${status}`);
      }
    }
  }

  // Soft filters — Super Admin list được toàn bộ; applicant thường bị rules chặn
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
    /* bỏ soft filter khi không đủ quyền list */
  }

  return [...new Set(hints)];
}

/**
 * Giữ khoá email/SĐT atomically — không ghi đè pending/approved của hồ sơ khác.
 */
async function claimLookupKey(
  kind: "email" | "phone",
  value: string,
  registrationId: string,
  status: RegistrationStatus,
): Promise<void> {
  if (!value) return;
  const ref = lookupRef(kind, value);
  await runTransaction(getDb(), async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) {
      const data = snap.data() as Record<string, unknown>;
      const prevStatus = String(data.status ?? "pending");
      const prevReg = String(data.registration_id ?? "");
      const sameReg = prevReg === registrationId;
      const reusable = prevStatus === "rejected";
      if (!sameReg && !reusable && status === "pending") {
        throw new Error(
          kind === "email"
            ? "Email đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác."
            : "Số điện thoại đã được đăng ký. Vui lòng dùng số khác hoặc liên hệ Super Admin.",
        );
      }
      if (!sameReg && !reusable && (status === "approved" || status === "rejected")) {
        // Super Admin cập nhật key của đúng hồ sơ; nếu lệch id thì vẫn cho SA ghi đè khi duyệt/từ chối cùng value
        if (prevReg && prevReg !== registrationId && prevStatus !== "rejected") {
          throw new Error(
            `Không cập nhật được khoá ${kind}: đang gắn hồ sơ khác (${prevStatus}).`,
          );
        }
      }
    }
    tx.set(ref, {
      registration_id: registrationId,
      status,
      updated_at: serverTimestamp(),
    });
  });
}

async function claimLookupKeys(
  registrationId: string,
  normEmail: string,
  normPhone: string,
  status: RegistrationStatus,
): Promise<void> {
  await claimLookupKey("email", normEmail, registrationId, status);
  await claimLookupKey("phone", normPhone, registrationId, status);
}

async function ensureApplicantUser(
  email: string,
  password: string | undefined,
  fullName: string,
): Promise<User> {
  const auth = getFirebaseAuth();
  const existing = auth.currentUser;

  if (existing) {
    const currentEmail = (existing.email ?? "").trim().toLowerCase();
    if (currentEmail && currentEmail !== email) {
      throw new Error(
        "Bạn đang đăng nhập bằng email khác. Đăng xuất rồi đăng ký lại, hoặc dùng đúng email tài khoản hiện tại.",
      );
    }
    if (fullName.trim() && existing.displayName !== fullName.trim()) {
      try {
        await updateProfile(existing, { displayName: fullName.trim() });
      } catch {
        /* không chặn gửi hồ sơ */
      }
    }
    return existing;
  }

  if (!password || password.length < 6) {
    throw new Error("Mật khẩu phải có ít nhất 6 ký tự.");
  }

  return registerWithEmail({
    email,
    password,
    displayName: fullName,
  });
}

/**
 * Đăng ký tài khoản (nếu chưa) + gửi hồ sơ tạo gia phả (status=pending).
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

  const norm_phone = normalizePhone(phone);
  if (norm_phone.length < 9 || norm_phone.length > 11) {
    throw new Error("Số điện thoại không hợp lệ.");
  }

  const duplicates = await findRegistrationDuplicates({
    email,
    phone,
    family_surname,
    family_name,
  });

  if (duplicates.some(isHardDuplicateHint)) {
    throw new Error(
      "Email hoặc số điện thoại đã được đăng ký. Vui lòng đăng nhập hoặc liên hệ Super Admin.",
    );
  }

  const user = await ensureApplicantUser(email, input.password, full_name);

  const mine = await getMyRegistrations(user.uid);
  if (mine.some((r) => r.status === "pending")) {
    throw new Error(
      "Bạn đã có hồ sơ đang chờ duyệt. Vào trang chờ duyệt để xem trạng thái.",
    );
  }
  if (mine.some((r) => r.status === "approved" && r.family_id)) {
    throw new Error("Tài khoản này đã có gia phả được duyệt.");
  }

  const norm_email = normalizeKey(email);
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

  try {
    await claimLookupKeys(ref.id, norm_email, norm_phone, "pending");
  } catch (err) {
    try {
      await deleteDoc(ref);
    } catch {
      /* best effort rollback */
    }
    throw err instanceof Error
      ? err
      : new Error("Không giữ được khoá đăng ký (có thể bị trùng).");
  }

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
  if (duplicates.some(isHardDuplicateHint)) {
    throw new Error(
      `Không duyệt được do trùng: ${duplicates.filter(isHardDuplicateHint).join("; ")}`,
    );
  }

  const family = await createFamilyForOwner(reg.applicant_uid, {
    name: reg.family_name,
    description:
      reg.description ||
      `Gia phả họ ${reg.family_surname} — người tạo: ${reg.full_name}`,
  });

  // Đánh dấu approved ngay sau khi tạo family — tránh duyệt lại tạo family thứ hai
  await updateDoc(ref, {
    status: "approved",
    family_id: family.id,
    reviewed_at: serverTimestamp(),
    reviewed_by: admin.uid,
    reject_reason: null,
    duplicate_hints: duplicates,
  });

  await claimLookupKeys(
    reg.id,
    reg.norm_email || normalizeKey(reg.email),
    reg.norm_phone || normalizePhone(reg.phone),
    "approved",
  );

  try {
    await upsertFamilyStaff({
      familyId: family.id,
      uid: reg.applicant_uid,
      email: reg.email,
      display_name: reg.full_name,
      role: "truong_ho",
      branch_id: null,
    });
  } catch {
    // Owner vẫn vào được dashboard qua owner_id; staff có thể bổ sung sau
  }

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

  await claimLookupKeys(
    reg.id,
    reg.norm_email || normalizeKey(reg.email),
    reg.norm_phone || normalizePhone(reg.phone),
    "rejected",
  );
}
