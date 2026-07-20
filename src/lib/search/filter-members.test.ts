import assert from "node:assert/strict";
import {
  filterMemberList,
  groupMemberRows,
  listGenerations,
} from "./filter-members";
import type { FamilyMember } from "@/types/genealogy";

function member(
  id: string,
  name: string,
  path: string[],
  branch_id: string,
  alive = true,
): FamilyMember {
  return {
    id,
    family_id: "f1",
    full_name: name,
    traditional_names: {},
    status: { is_alive: alive, is_placeholder: false },
    dates: {},
    tree_logic: {
      parent_id: path.length > 1 ? path[path.length - 2]! : null,
      path,
      branch_id,
      relationship_type: "BLOOD",
    },
    spouses: [],
  };
}

function run() {
  const members = [
    member("a", "Nguyễn Văn A", ["a"], "branch-main"),
    member("b", "Nguyễn Văn B", ["a", "b"], "branch-main"),
    member("c", "Trần Thị C", ["a", "c"], "branch-east", false),
  ];
  const branches = [
    { id: "branch-main", name: "Chi chính" },
    { id: "branch-east", name: "Chi Đông" },
  ];

  assert.deepEqual(listGenerations(members), [1, 2]);

  const byGen2 = filterMemberList(
    members,
    {
      query: "",
      generation: 2,
      branchId: "all",
      life: "all",
      includePlaceholders: false,
    },
    branches,
  );
  assert.equal(byGen2.length, 2);

  const search = filterMemberList(
    members,
    {
      query: "tran thi",
      generation: "all",
      branchId: "all",
      life: "all",
      includePlaceholders: false,
    },
    branches,
  );
  assert.equal(search.length, 1);
  assert.equal(search[0]?.member.full_name, "Trần Thị C");

  const grouped = groupMemberRows(byGen2, "branch");
  assert.equal(grouped.length, 2);

  const emptyGrouped = groupMemberRows([], "list");
  assert.equal(emptyGrouped.length, 0);

  console.log("filter-members.test: ok");
}

run();
