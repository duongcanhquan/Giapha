import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteField,
  writeBatch,
  type DocumentReference,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { buildMaterializedPath } from "@/lib/genealogy/materialized-path";
import type {
  AddMemberInput,
  AddPlaceholderInput,
  FamilyMember,
  FamilyRelation,
  MemberContact,
  RelationshipType,
  UpdateMemberInput,
} from "@/types/genealogy";

export { buildMaterializedPath } from "@/lib/genealogy/materialized-path";

const MEMBERS = "members";
const RELATIONS = "relations";
const SENSITIVE = "sensitive";
const CONTACT_DOC = "contact";

function membersCol() {
  return collection(getDb(), MEMBERS);
}

function memberRef(id: string): DocumentReference {
  return doc(getDb(), MEMBERS, id);
}

function contactRef(memberId: string): DocumentReference {
  return doc(getDb(), MEMBERS, memberId, SENSITIVE, CONTACT_DOC);
}

function relationsCol() {
  return collection(getDb(), RELATIONS);
}

function nowIso() {
  return new Date().toISOString();
}

async function loadParent(parentId: string): Promise<FamilyMember> {
  const snap = await getDoc(memberRef(parentId));
  if (!snap.exists()) {
    throw new Error(`Không tìm thấy parent_id="${parentId}" để nối cây.`);
  }
  return { id: snap.id, ...(snap.data() as Omit<FamilyMember, "id">) };
}

async function writeContact(
  memberId: string,
  contact: MemberContact | null | undefined,
): Promise<void> {
  if (contact === undefined) return;
  if (contact === null) {
    await setDoc(contactRef(memberId), { phone: null, address: null, email: null });
    return;
  }
  await setDoc(
    contactRef(memberId),
    {
      phone: contact.phone ?? null,
      address: contact.address ?? null,
      email: contact.email ?? null,
      notes: contact.notes ?? null,
    },
    { merge: true },
  );
}

function publicMemberPayload(
  member: Omit<FamilyMember, "created_at" | "updated_at"> & {
    created_at?: string;
    updated_at?: string;
  },
): Record<string, unknown> {
  // Không bao giờ ghi `contact` lên document công khai (Security Rules).
  const { ...rest } = member;
  return {
    ...rest,
    updated_at: nowIso(),
  };
}

async function createRelation(params: {
  parentId: string;
  childId: string;
  relationshipType: RelationshipType;
  branchId: string;
}): Promise<FamilyRelation> {
  const ref = doc(relationsCol());
  const relation: FamilyRelation = {
    id: ref.id,
    source: params.parentId,
    target: params.childId,
    relationship_type: params.relationshipType,
    tree_logic: { branch_id: params.branchId },
  };
  await setDoc(ref, relation);
  return relation;
}

/**
 * Thêm thành viên mới vào cây.
 * Tự tính `path` = path(parent_id) + [newId] — kể cả khi nối qua PlaceholderNode.
 */
export async function addMember(
  input: AddMemberInput,
): Promise<{ member: FamilyMember; relation: FamilyRelation }> {
  const parent = await loadParent(input.parent_id);
  const ref = input.id ? memberRef(input.id) : doc(membersCol());
  const id = ref.id;

  const branchId =
    input.tree_logic?.branch_id ?? parent.tree_logic.branch_id;

  const path = buildMaterializedPath(parent.path, id);
  const generation = parent.generation + 1;

  const member: FamilyMember = {
    id,
    full_name: input.full_name,
    generation,
    life_status: input.life_status ?? "LIVING",
    gender: input.gender ?? "UNKNOWN",
    is_huong_hoa: input.is_huong_hoa ?? false,
    is_placeholder: false,
    spouses: input.spouses ?? [],
    parent_ids: [input.parent_id],
    path,
    tree_logic: {
      branch_id: branchId,
      position: input.tree_logic?.position ?? parent.tree_logic.position,
    },
    birth_year: input.birth_year ?? null,
    death_year: input.death_year ?? null,
    notes: input.notes,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  const batch = writeBatch(getDb());
  batch.set(ref, {
    ...publicMemberPayload(member),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  const relationRef = doc(relationsCol());
  const relation: FamilyRelation = {
    id: relationRef.id,
    source: input.parent_id,
    target: id,
    relationship_type: input.relationship_type ?? "BLOOD",
    tree_logic: { branch_id: branchId },
  };
  batch.set(relationRef, relation);
  await batch.commit();

  if (input.contact) {
    await writeContact(id, input.contact);
  }

  return { member, relation };
}

/**
 * Cập nhật thành viên. Không cho client ghi đè `path` / `id`.
 * `contact` (nếu có) ghi vào subcollection sensitive — không lên document công khai.
 */
export async function updateMember(
  memberId: string,
  input: UpdateMemberInput,
): Promise<FamilyMember> {
  const ref = memberRef(memberId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`Không tìm thấy thành viên id="${memberId}".`);
  }

  const { contact, ...publicFields } = input;
  const patch: Record<string, unknown> = {
    ...publicFields,
    updated_at: serverTimestamp(),
  };

  // Chặn ghi đè Materialized Path / identity từ payload
  delete patch.id;
  delete patch.path;
  delete patch.contact;

  if (Object.keys(publicFields).length > 0) {
    await updateDoc(ref, patch);
  }

  if (contact !== undefined) {
    if (contact === null) {
      await updateDoc(contactRef(memberId), {
        phone: deleteField(),
        address: deleteField(),
        email: deleteField(),
        notes: deleteField(),
      }).catch(async () => {
        await setDoc(contactRef(memberId), {});
      });
    } else {
      await writeContact(memberId, contact);
    }
  }

  const next = await getDoc(ref);
  return { id: next.id, ...(next.data() as Omit<FamilyMember, "id">) };
}

/**
 * Tạo PlaceholderNode (khuyết danh) gắn dưới `parent_id`.
 * Vẫn duy trì Materialized Path đầy đủ để sau này `addMember` / cập nhật không đứt cây.
 */
export async function addPlaceholderNode(
  input: AddPlaceholderInput,
): Promise<{ member: FamilyMember; relation: FamilyRelation }> {
  const parent = await loadParent(input.parent_id);
  const ref = input.id ? memberRef(input.id) : doc(membersCol());
  const id = ref.id;
  const branchId =
    input.tree_logic?.branch_id ?? parent.tree_logic.branch_id;
  const path = buildMaterializedPath(parent.path, id);

  const member: FamilyMember = {
    id,
    full_name: "",
    generation: input.generation ?? parent.generation + 1,
    life_status: "DECEASED",
    gender: "UNKNOWN",
    is_huong_hoa: false,
    is_placeholder: true,
    spouses: [],
    parent_ids: [input.parent_id],
    path,
    tree_logic: {
      branch_id: branchId,
      position: input.tree_logic?.position,
    },
    birth_year: null,
    death_year: null,
    notes: input.notes ?? "Khuyết danh",
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  await setDoc(ref, {
    ...publicMemberPayload(member),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  const relation = await createRelation({
    parentId: input.parent_id,
    childId: id,
    relationshipType: input.relationship_type ?? "BLOOD",
    branchId,
  });

  return { member, relation };
}

/** Đọc contact (chỉ thành công khi rules cho phép — admin). */
export async function getMemberContact(
  memberId: string,
): Promise<MemberContact | null> {
  const snap = await getDoc(contactRef(memberId));
  if (!snap.exists()) return null;
  return snap.data() as MemberContact;
}
