import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase/client";
import type { FamilyStaffMember, FamilyStaffRole } from "@/types/genealogy";

function staffCol(familyId: string) {
  return collection(getDb(), "families", familyId, "staff");
}

function staffRef(familyId: string, uid: string) {
  return doc(getDb(), "families", familyId, "staff", uid);
}

function mapStaff(
  familyId: string,
  uid: string,
  data: Record<string, unknown>,
): FamilyStaffMember {
  return {
    uid,
    family_id: familyId,
    email: String(data.email ?? ""),
    display_name: String(data.display_name ?? ""),
    role: (data.role as FamilyStaffRole) ?? "editor",
    branch_id: (data.branch_id as string) ?? null,
    created_at:
      data.created_at &&
      typeof data.created_at === "object" &&
      "toDate" in data.created_at
        ? (data.created_at as { toDate: () => Date }).toDate().toISOString()
        : (data.created_at as string) ?? null,
    created_by: (data.created_by as string) ?? null,
  };
}

export async function listFamilyStaff(
  familyId: string,
): Promise<FamilyStaffMember[]> {
  const snap = await getDocs(staffCol(familyId));
  return snap.docs.map((d) =>
    mapStaff(familyId, d.id, d.data() as Record<string, unknown>),
  );
}

export async function getFamilyStaffMember(
  familyId: string,
  uid: string,
): Promise<FamilyStaffMember | null> {
  const snap = await getDoc(staffRef(familyId, uid));
  if (!snap.exists()) return null;
  return mapStaff(familyId, uid, snap.data() as Record<string, unknown>);
}

export async function upsertFamilyStaff(input: {
  familyId: string;
  uid: string;
  email: string;
  display_name: string;
  role: FamilyStaffRole;
  branch_id?: string | null;
}): Promise<FamilyStaffMember> {
  const actor = getFirebaseAuth().currentUser;
  if (!actor) throw new Error("Cần đăng nhập.");

  const uid = input.uid.trim();
  if (!uid) throw new Error("Thiếu UID người được uỷ quyền.");

  const ref = staffRef(input.familyId, uid);
  const prev = await getDoc(ref);
  await setDoc(
    ref,
    {
      email: input.email.trim().toLowerCase(),
      display_name: input.display_name.trim(),
      role: input.role,
      branch_id: input.branch_id ?? null,
      ...(prev.exists()
        ? { updated_at: serverTimestamp() }
        : {
            created_at: serverTimestamp(),
            created_by: actor.uid,
            updated_at: serverTimestamp(),
          }),
    },
    { merge: true },
  );

  const next = await getFamilyStaffMember(input.familyId, uid);
  if (!next) throw new Error("Không lưu được nhân sự.");
  return next;
}

export async function removeFamilyStaff(
  familyId: string,
  uid: string,
): Promise<void> {
  await deleteDoc(staffRef(familyId, uid));
}
