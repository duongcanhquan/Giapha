import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentReference,
} from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase/client";
import type { FamilyManager, FamilyManagerStatus } from "@/types/managers";
import {
  managerDocId,
  normalizeManagerEmail,
} from "@/types/managers";

const MANAGERS = "family_managers";

function managersCol() {
  return collection(getDb(), MANAGERS);
}

function managerRef(id: string): DocumentReference {
  return doc(getDb(), MANAGERS, id);
}

function mapManager(id: string, data: Record<string, unknown>): FamilyManager {
  return {
    id,
    family_id: String(data.family_id ?? ""),
    uid: (data.uid as string | null) ?? null,
    email: normalizeManagerEmail(String(data.email ?? "")),
    display_name: (data.display_name as string | null) ?? null,
    role: "branch_admin",
    branch_id: String(data.branch_id ?? ""),
    branch_name: (data.branch_name as string | null) ?? null,
    status: (data.status as FamilyManagerStatus) ?? "pending",
    created_by: String(data.created_by ?? ""),
    created_at:
      data.created_at &&
      typeof data.created_at === "object" &&
      "toDate" in data.created_at
        ? (data.created_at as { toDate: () => Date }).toDate().toISOString()
        : (data.created_at as string | null) ?? null,
    updated_at:
      data.updated_at &&
      typeof data.updated_at === "object" &&
      "toDate" in data.updated_at
        ? (data.updated_at as { toDate: () => Date }).toDate().toISOString()
        : (data.updated_at as string | null) ?? null,
  };
}

/** Danh sách quản lý của một dòng họ (chủ / super admin). */
export async function listFamilyManagers(
  familyId: string,
): Promise<FamilyManager[]> {
  const snap = await getDocs(
    query(managersCol(), where("family_id", "==", familyId)),
  );
  return snap.docs
    .map((d) => mapManager(d.id, d.data() as Record<string, unknown>))
    .filter((m) => m.status !== "revoked")
    .sort((a, b) => a.email.localeCompare(b.email));
}

/**
 * Chủ dòng họ mời trưởng nhánh theo email + chi.
 * Nếu người đó đã đăng nhập trùng email → gắn uid ngay (active).
 */
export async function inviteBranchManager(input: {
  familyId: string;
  email: string;
  branchId: string;
  branchName?: string | null;
}): Promise<FamilyManager> {
  const auth = getFirebaseAuth().currentUser;
  if (!auth) throw new Error("Bạn cần đăng nhập.");

  const email = normalizeManagerEmail(input.email);
  if (!email || !email.includes("@")) {
    throw new Error("Email không hợp lệ.");
  }
  if (!input.branchId) {
    throw new Error("Chọn chi / nhánh để giao quyền.");
  }

  // Tránh trùng email đang hoạt động trong cùng family
  const existing = await listFamilyManagers(input.familyId);
  const dup = existing.find(
    (m) => m.email === email && (m.status === "active" || m.status === "pending"),
  );
  if (dup) {
    throw new Error("Email này đã được mời hoặc đang là trưởng nhánh.");
  }

  // Doc tạm theo email (pending) — khi họ đăng nhập sẽ được claim → chuyển sang id theo uid
  const pendingId = `${input.familyId}__pending__${email.replace(/[^a-z0-9]/gi, "_")}`;
  const payload = {
    family_id: input.familyId,
    uid: null as string | null,
    email,
    display_name: null,
    role: "branch_admin" as const,
    branch_id: input.branchId,
    branch_name: input.branchName ?? null,
    status: "pending" as const,
    created_by: auth.uid,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  await setDoc(managerRef(pendingId), payload);

  return mapManager(pendingId, {
    ...payload,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

/** Thu hồi quyền trưởng nhánh */
export async function revokeBranchManager(managerId: string): Promise<void> {
  const auth = getFirebaseAuth().currentUser;
  if (!auth) throw new Error("Bạn cần đăng nhập.");
  await updateDoc(managerRef(managerId), {
    status: "revoked",
    updated_at: serverTimestamp(),
  });
}

export async function deleteBranchManager(managerId: string): Promise<void> {
  await deleteDoc(managerRef(managerId));
}

/**
 * Khi user đăng nhập: nhận lời mời pending trùng email → tạo doc theo uid (rules dùng được).
 * Gọi mỗi lần vào dashboard.
 */
export async function claimPendingManagerInvites(
  familyId: string,
  user: { uid: string; email: string | null; displayName: string | null },
): Promise<FamilyManager | null> {
  if (!user.email) return null;
  const email = normalizeManagerEmail(user.email);

  const snap = await getDocs(
    query(
      managersCol(),
      where("family_id", "==", familyId),
      where("email", "==", email),
    ),
  );

  let claimed: FamilyManager | null = null;

  for (const d of snap.docs) {
    const data = d.data() as Record<string, unknown>;
    const status = data.status as FamilyManagerStatus;
    if (status === "revoked") continue;

    // Đã có doc theo uid
    if (d.id === managerDocId(familyId, user.uid)) {
      if (status !== "active") {
        await updateDoc(d.ref, {
          status: "active",
          uid: user.uid,
          display_name: user.displayName,
          updated_at: serverTimestamp(),
        });
      }
      claimed = mapManager(d.id, { ...data, status: "active", uid: user.uid });
      continue;
    }

    // Pending theo email → tạo/cập nhật doc keyed by uid
    const uidDocId = managerDocId(familyId, user.uid);
    await setDoc(
      managerRef(uidDocId),
      {
        family_id: familyId,
        uid: user.uid,
        email,
        display_name: user.displayName,
        role: "branch_admin",
        branch_id: data.branch_id,
        branch_name: data.branch_name ?? null,
        status: "active",
        created_by: data.created_by ?? user.uid,
        created_at: data.created_at ?? serverTimestamp(),
        updated_at: serverTimestamp(),
      },
      { merge: true },
    );

    // Đánh dấu pending cũ
    if (status === "pending" || data.uid == null) {
      await updateDoc(d.ref, {
        status: "active",
        uid: user.uid,
        updated_at: serverTimestamp(),
      });
    }

    claimed = mapManager(uidDocId, {
      family_id: familyId,
      uid: user.uid,
      email,
      display_name: user.displayName,
      role: "branch_admin",
      branch_id: data.branch_id,
      branch_name: data.branch_name,
      status: "active",
      created_by: data.created_by,
    });
  }

  // Tra cứu luôn doc theo uid (đã active)
  if (!claimed) {
    const byUid = await getDocs(
      query(
        managersCol(),
        where("family_id", "==", familyId),
        where("uid", "==", user.uid),
        where("status", "==", "active"),
      ),
    );
    if (!byUid.empty) {
      const d = byUid.docs[0]!;
      claimed = mapManager(d.id, d.data() as Record<string, unknown>);
    }
  }

  return claimed;
}

/** Tìm quyền trưởng nhánh active của user trên family */
export async function findActiveBranchManager(
  familyId: string,
  uid: string,
  email?: string | null,
): Promise<FamilyManager | null> {
  const byUid = await getDocs(
    query(
      managersCol(),
      where("family_id", "==", familyId),
      where("uid", "==", uid),
      where("status", "==", "active"),
    ),
  );
  if (!byUid.empty) {
    return mapManager(
      byUid.docs[0]!.id,
      byUid.docs[0]!.data() as Record<string, unknown>,
    );
  }

  if (email) {
    return claimPendingManagerInvites(familyId, {
      uid,
      email,
      displayName: null,
    });
  }
  return null;
}
