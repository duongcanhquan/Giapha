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

const MEMBERS = "family_members";
const RELATIONS = "family_relations";
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
    await setDoc(contactRef(memberId), {
      phone: null,
      address: null,
      email: null,
    });
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

async function createRelation(params: {
  familyId: string;
  branchId: string;
  parentId: string;
  childId: string;
  relationshipType: RelationshipType;
}): Promise<FamilyRelation> {
  const ref = doc(relationsCol());
  const relation: FamilyRelation = {
    id: ref.id,
    family_id: params.familyId,
    branch_id: params.branchId,
    source: params.parentId,
    target: params.childId,
    relationship_type: params.relationshipType,
  };
  await setDoc(ref, relation);
  return relation;
}

export async function addMember(
  input: AddMemberInput,
): Promise<{ member: FamilyMember; relation: FamilyRelation }> {
  if (!input.family_id) {
    throw new Error("family_id là bắt buộc khi thêm thành viên.");
  }

  const parent = await loadParent(input.parent_id);
  if (parent.family_id !== input.family_id) {
    throw new Error("parent_id không thuộc cùng family_id.");
  }

  const ref = input.id ? memberRef(input.id) : doc(membersCol());
  const id = ref.id;
  const branchId =
    input.branch_id ?? parent.tree_logic.branch_id;
  const relationshipType = input.relationship_type ?? "BLOOD";
  const path = buildMaterializedPath(parent.tree_logic.path, id);

  const member: FamilyMember = {
    id,
    family_id: input.family_id,
    full_name: input.full_name,
    traditional_names: input.traditional_names ?? {},
    status: {
      is_alive: input.is_alive ?? true,
      is_placeholder: false,
    },
    dates: {
      birth: input.dates?.birth ?? null,
      death: input.dates?.death ?? null,
      lunar_death: input.dates?.lunar_death ?? null,
    },
    tree_logic: {
      parent_id: input.parent_id,
      path,
      branch_id: branchId,
      relationship_type: relationshipType,
      position: parent.tree_logic.position,
    },
    spouses: input.spouses ?? [],
    gender: input.gender ?? "UNKNOWN",
    is_huong_hoa: input.is_huong_hoa ?? false,
    biography: input.biography ?? null,
    notes: input.notes,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  const batch = writeBatch(getDb());
  batch.set(ref, {
    ...member,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  const relationRef = doc(relationsCol());
  const relation: FamilyRelation = {
    id: relationRef.id,
    family_id: input.family_id,
    branch_id: branchId,
    source: input.parent_id,
    target: id,
    relationship_type: relationshipType,
  };
  batch.set(relationRef, relation);
  await batch.commit();

  if (input.contact) {
    await writeContact(id, input.contact);
  }

  return { member, relation };
}

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

  delete patch.id;
  delete patch.family_id;
  delete patch.contact;
  if (patch.tree_logic && typeof patch.tree_logic === "object") {
    const logic = patch.tree_logic as Record<string, unknown>;
    delete logic.path;
  }

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

export async function addPlaceholderNode(
  input: AddPlaceholderInput,
): Promise<{ member: FamilyMember; relation: FamilyRelation }> {
  if (!input.family_id) {
    throw new Error("family_id là bắt buộc khi tạo PlaceholderNode.");
  }

  const parent = await loadParent(input.parent_id);
  if (parent.family_id !== input.family_id) {
    throw new Error("parent_id không thuộc cùng family_id.");
  }

  const ref = input.id ? memberRef(input.id) : doc(membersCol());
  const id = ref.id;
  const branchId = input.branch_id ?? parent.tree_logic.branch_id;
  const relationshipType = input.relationship_type ?? "BLOOD";
  const path = buildMaterializedPath(parent.tree_logic.path, id);

  const member: FamilyMember = {
    id,
    family_id: input.family_id,
    full_name: "",
    traditional_names: {},
    status: { is_alive: false, is_placeholder: true },
    dates: { birth: null, death: null, lunar_death: null },
    tree_logic: {
      parent_id: input.parent_id,
      path,
      branch_id: branchId,
      relationship_type: relationshipType,
    },
    spouses: [],
    gender: "UNKNOWN",
    is_huong_hoa: false,
    notes: input.notes ?? "Khuyết danh",
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  await setDoc(ref, {
    ...member,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  const relation = await createRelation({
    familyId: input.family_id,
    branchId,
    parentId: input.parent_id,
    childId: id,
    relationshipType,
  });

  return { member, relation };
}

export async function getMemberContact(
  memberId: string,
): Promise<MemberContact | null> {
  const snap = await getDoc(contactRef(memberId));
  if (!snap.exists()) return null;
  return snap.data() as MemberContact;
}
