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
import {
  getDb,
  getFirebaseAuth,
  provisionAuthUser,
} from "@/lib/firebase/client";
import type { FamilyManager, FamilyManagerStatus } from "@/types/managers";
import {
  formatManagerBranches,
  managerDocId,
  normalizeManagerEmail,
  resolveManagerBranchIds,
  resolveManagerBranchNames,
} from "@/types/managers";

const MANAGERS = "family_managers";

function managersCol() {
  return collection(getDb(), MANAGERS);
}

function managerRef(id: string): DocumentReference {
  return doc(getDb(), MANAGERS, id);
}

function mapManager(id: string, data: Record<string, unknown>): FamilyManager {
  const branch_ids = resolveManagerBranchIds(data);
  const branch_names = resolveManagerBranchNames(data, branch_ids);
  return {
    id,
    family_id: String(data.family_id ?? ""),
    uid: (data.uid as string | null) ?? null,
    email: normalizeManagerEmail(String(data.email ?? "")),
    display_name: (data.display_name as string | null) ?? null,
    role: "branch_admin",
    branch_ids,
    branch_names: branch_names.length ? branch_names : null,
    branch_id: branch_ids[0] ?? "",
    branch_name: branch_names[0] ?? null,
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

function uniqBranches(
  ids: string[],
  names: (string | null | undefined)[],
): { branch_ids: string[]; branch_names: string[] } {
  const seen = new Set<string>();
  const branch_ids: string[] = [];
  const branch_names: string[] = [];
  ids.forEach((id, i) => {
    const bid = id.trim();
    if (!bid || seen.has(bid)) return;
    seen.add(bid);
    branch_ids.push(bid);
    branch_names.push(String(names[i] ?? "").trim());
  });
  return { branch_ids, branch_names };
}

/** Danh sách quản lý của một dòng họ (chủ / super admin). */
export async function listFamilyManagers(
  familyId: string,
): Promise<FamilyManager[]> {
  const snap = await getDocs(
    query(managersCol(), where("family_id", "==", familyId)),
  );
  const mapped = snap.docs.map((d) =>
    mapManager(d.id, d.data() as Record<string, unknown>),
  );

  // Gộp bản ghi pending + uid trùng email (claim cũ để lại rác)
  const byEmail = new Map<string, FamilyManager>();
  for (const m of mapped) {
    if (m.status === "revoked") continue;
    const prev = byEmail.get(m.email);
    if (!prev) {
      byEmail.set(m.email, m);
      continue;
    }
    // Ưu tiên doc theo uid / active
    const prefer =
      m.uid && (!prev.uid || m.status === "active")
        ? m
        : prev.uid && !m.uid
          ? prev
          : m.id.includes("__pending__")
            ? prev
            : m;
    const other = prefer.id === m.id ? prev : m;
    const merged = uniqBranches(
      [...prefer.branch_ids, ...other.branch_ids],
      [
        ...(prefer.branch_names ?? []),
        ...(other.branch_names ?? []),
      ],
    );
    byEmail.set(m.email, {
      ...prefer,
      branch_ids: merged.branch_ids,
      branch_names: merged.branch_names,
      branch_id: merged.branch_ids[0] ?? "",
      branch_name: merged.branch_names[0] ?? null,
    });
  }

  return [...byEmail.values()].sort((a, b) => a.email.localeCompare(b.email));
}

export type InviteBranchManagerResult = {
  manager: FamilyManager;
  /** true nếu vừa tạo Auth user mới */
  accountCreated: boolean;
  /** Mật khẩu chủ vừa đặt (để hiện một lần) */
  password: string;
};

/**
 * Chủ dòng họ tạo tài khoản (email + mật khẩu) và giao 1 hoặc nhiều chi.
 * Nếu email đã có tài khoản → cần đúng mật khẩu hiện tại để lấy uid và gắn thêm nhánh.
 */
export async function inviteBranchManager(input: {
  familyId: string;
  email: string;
  password: string;
  branchIds: string[];
  branchNames?: (string | null)[];
}): Promise<InviteBranchManagerResult> {
  const auth = getFirebaseAuth().currentUser;
  if (!auth) throw new Error("Bạn cần đăng nhập.");

  const email = normalizeManagerEmail(input.email);
  if (!email || !email.includes("@")) {
    throw new Error("Email không hợp lệ.");
  }
  const password = input.password;
  if (!password || password.length < 6) {
    throw new Error("Mật khẩu ít nhất 6 ký tự.");
  }

  const mergedInput = uniqBranches(
    input.branchIds,
    input.branchNames ?? [],
  );
  if (!mergedInput.branch_ids.length) {
    throw new Error("Chọn ít nhất một chi / nhánh để giao quyền.");
  }

  const { uid, created } = await provisionAuthUser(email, password);

  const existing = await listFamilyManagers(input.familyId);
  const prev = existing.find(
    (m) =>
      m.email === email && (m.status === "active" || m.status === "pending"),
  );

  const merged = uniqBranches(
    [...(prev?.branch_ids ?? []), ...mergedInput.branch_ids],
    [
      ...(prev?.branch_names ?? []),
      ...mergedInput.branch_names,
    ],
  );

  const uidDocId = managerDocId(input.familyId, uid);

  await setDoc(
    managerRef(uidDocId),
    {
      family_id: input.familyId,
      uid,
      email,
      display_name: null,
      role: "branch_admin",
      branch_ids: merged.branch_ids,
      branch_names: merged.branch_names,
      branch_id: merged.branch_ids[0]!,
      branch_name: merged.branch_names[0] || null,
      status: "active",
      created_by: prev?.created_by ?? auth.uid,
      ...(prev ? {} : { created_at: serverTimestamp() }),
      updated_at: serverTimestamp(),
    },
    { merge: true },
  );

  // Xoá / thu hồi doc pending theo email nếu còn
  const allSnap = await getDocs(
    query(
      managersCol(),
      where("family_id", "==", input.familyId),
      where("email", "==", email),
    ),
  );
  for (const d of allSnap.docs) {
    if (d.id === uidDocId) continue;
    if (d.id.includes("__pending__") || d.data().uid == null) {
      await deleteDoc(d.ref).catch(async () => {
        await updateDoc(d.ref, {
          status: "revoked",
          updated_at: serverTimestamp(),
        });
      });
    }
  }

  const manager = mapManager(uidDocId, {
    family_id: input.familyId,
    uid,
    email,
    display_name: null,
    role: "branch_admin",
    branch_ids: merged.branch_ids,
    branch_names: merged.branch_names,
    branch_id: merged.branch_ids[0],
    branch_name: merged.branch_names[0] || null,
    status: "active",
    created_by: prev?.created_by ?? auth.uid,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return {
    manager,
    accountCreated: created,
    password,
  };
}

/** Cập nhật danh sách chi của trưởng nhánh (chủ họ). */
export async function updateManagerBranches(input: {
  managerId: string;
  branchIds: string[];
  branchNames?: (string | null)[];
}): Promise<void> {
  const auth = getFirebaseAuth().currentUser;
  if (!auth) throw new Error("Bạn cần đăng nhập.");
  const merged = uniqBranches(input.branchIds, input.branchNames ?? []);
  if (!merged.branch_ids.length) {
    throw new Error("Cần ít nhất một chi.");
  }
  await updateDoc(managerRef(input.managerId), {
    branch_ids: merged.branch_ids,
    branch_names: merged.branch_names,
    branch_id: merged.branch_ids[0],
    branch_name: merged.branch_names[0] || null,
    updated_at: serverTimestamp(),
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
 * Khi user đăng nhập: kích hoạt doc theo uid nếu chủ đã tạo,
 * hoặc gắn uid vào bản ghi email (pending) nếu còn.
 */
export async function claimPendingManagerInvites(
  familyId: string,
  user: { uid: string; email: string | null; displayName: string | null },
): Promise<FamilyManager | null> {
  if (!user.email) return null;
  const email = normalizeManagerEmail(user.email);
  const uidDocId = managerDocId(familyId, user.uid);

  // Ưu tiên doc đã có key familyId__uid (flow mời có mật khẩu)
  const uidSnap = await getDocs(
    query(
      managersCol(),
      where("family_id", "==", familyId),
      where("uid", "==", user.uid),
      where("status", "==", "active"),
    ),
  );
  if (!uidSnap.empty) {
    const d = uidSnap.docs[0]!;
    return mapManager(d.id, d.data() as Record<string, unknown>);
  }

  const snap = await getDocs(
    query(
      managersCol(),
      where("family_id", "==", familyId),
      where("email", "==", email),
    ),
  );

  const usable = snap.docs.filter((d) => {
    const st = (d.data() as { status?: string }).status;
    return st !== "revoked";
  });
  if (!usable.length) return null;

  const collectedIds: string[] = [];
  const collectedNames: string[] = [];
  for (const d of usable) {
    const data = d.data() as Record<string, unknown>;
    const ids = resolveManagerBranchIds(data);
    const names = resolveManagerBranchNames(data, ids);
    collectedIds.push(...ids);
    collectedNames.push(...names);
  }
  const merged = uniqBranches(collectedIds, collectedNames);
  const first = usable[0]!.data() as Record<string, unknown>;

  const payload = {
    family_id: familyId,
    uid: user.uid,
    email,
    display_name: user.displayName,
    role: "branch_admin" as const,
    branch_ids: merged.branch_ids.length
      ? merged.branch_ids
      : resolveManagerBranchIds(first),
    branch_names: merged.branch_names,
    branch_id:
      (merged.branch_ids[0] || resolveManagerBranchIds(first)[0]) ?? "",
    branch_name: merged.branch_names[0] || null,
    status: "active" as const,
    created_by: first.created_by ?? user.uid,
    updated_at: serverTimestamp(),
  };

  // Cập nhật mọi bản ghi email (pending) — được rules cho phép
  for (const d of usable) {
    await updateDoc(d.ref, {
      uid: user.uid,
      status: "active",
      display_name: user.displayName,
      updated_at: serverTimestamp(),
    }).catch(() => undefined);
  }

  // Nếu đã có / merge được doc familyId__uid thì dùng (chủ đã tạo lúc mời)
  try {
    await setDoc(
      managerRef(uidDocId),
      {
        ...payload,
        created_at: first.created_at ?? serverTimestamp(),
      },
      { merge: true },
    );
    return mapManager(uidDocId, {
      ...payload,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Không tạo được doc uid (rules: chỉ chủ tạo) — dùng bản ghi email đã kích hoạt
    return mapManager(usable[0]!.id, {
      ...payload,
      created_at: new Date().toISOString(),
    });
  }
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

/** Family ids mà email đang được giao quyền (active/pending). */
export async function listManagedFamilyIdsForEmail(
  email: string | null | undefined,
): Promise<string[]> {
  if (!email) return [];
  const normalized = normalizeManagerEmail(email);
  const snap = await getDocs(
    query(managersCol(), where("email", "==", normalized)),
  );
  const ids = new Set<string>();
  for (const d of snap.docs) {
    const data = d.data() as Record<string, unknown>;
    if (data.status === "revoked") continue;
    const fid = String(data.family_id ?? "");
    if (fid) ids.add(fid);
  }
  return [...ids];
}

export { formatManagerBranches };
