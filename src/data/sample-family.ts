import type { FamilyTreeData } from "@/types/genealogy";

/** Dữ liệu mẫu — dòng họ Nguyễn (minh hoạ Phase 2 FamilyTree) */
export const sampleFamilyTree: FamilyTreeData = {
  family_id: "family-demo-nguyen",
  clan_name: "Nguyễn",
  members: [
    {
      id: "m1",

      family_id: "family-demo-nguyen",

      branch_id: "branch-main",
      full_name: "Nguyễn Văn Tổ",
      generation: 1,
      life_status: "DECEASED",
      gender: "MALE",
      is_huong_hoa: true,
      is_placeholder: false,
      spouses: [
        {
          id: "m1s",
          full_name: "Trần Thị Lan",
          life_status: "DECEASED",
        },
      ],
      parent_ids: [],
      path: ["m1"],
      tree_logic: { branch_id: "branch-main", position: { order: 0 } },
      names: { huy: "Tổ", thuy: "Cẩn Đức", tu: "Văn Tổ" },
      biography:
        "Thủy tổ dòng họ Nguyễn tại làng quê. Dạy con cháu giữ chữ tín và lệ giỗ tổ đầu xuân.",
      birth_year: 1880,
      death_year: 1955,
      death_date: "1955-03-15",
      lunar_death_date: "1955-2-22",
    },
    {
      id: "m2",

      family_id: "family-demo-nguyen",

      branch_id: "branch-main",
      full_name: "Nguyễn Văn Thành",
      generation: 2,
      life_status: "DECEASED",
      gender: "MALE",
      is_huong_hoa: true,
      is_placeholder: false,
      spouses: [
        {
          id: "m2s",
          full_name: "Lê Thị Hoa",
          life_status: "DECEASED",
        },
      ],
      parent_ids: ["m1"],
      path: ["m1", "m2"],
      tree_logic: { branch_id: "branch-main", position: { order: 0 } },
      names: { huy: "Thành", thuy: "Trung Hiếu" },
      biography:
        "Người giữ hương hỏa đời thứ hai. Trùng tu bàn thờ tổ và chép lại sổ gia phả sau biến cố.",
      birth_year: 1910,
      death_year: 1988,
      death_date: "1988-11-02",
    },
    {
      id: "m3",

      family_id: "family-demo-nguyen",

      branch_id: "branch-main",
      full_name: "Nguyễn Văn Minh",
      generation: 2,
      life_status: "DECEASED",
      gender: "MALE",
      is_placeholder: false,
      spouses: [],
      parent_ids: ["m1"],
      path: ["m1", "m3"],
      tree_logic: { branch_id: "branch-main", position: { order: 0 } },
      names: { huy: "Minh", thuy: "Nghĩa Lâm" },
      biography: "Chi thứ của dòng họ; nuôi dưỡng và nhận con nuôi để nối nhánh.",
      birth_year: 1915,
      death_year: 1972,
      death_date: "1972-07-08",
    },
    {
      id: "m4",

      family_id: "family-demo-nguyen",

      branch_id: "branch-main",
      full_name: "Nguyễn Văn An",
      generation: 3,
      life_status: "LIVING",
      gender: "MALE",
      is_huong_hoa: true,
      is_placeholder: false,
      spouses: [
        {
          id: "m4s",
          full_name: "Phạm Thị Mai",
          life_status: "LIVING",
        },
      ],
      parent_ids: ["m2"],
      path: ["m1", "m2", "m4"],
      tree_logic: { branch_id: "branch-main", position: { order: 0 } },
      birth_year: 1955,
    },
    {
      id: "m5",

      family_id: "family-demo-nguyen",

      branch_id: "branch-main",
      full_name: "",
      generation: 3,
      life_status: "DECEASED",
      gender: "UNKNOWN",
      is_placeholder: true,
      spouses: [],
      parent_ids: ["m2"],
      path: ["m1", "m2", "m5"],
      tree_logic: { branch_id: "branch-main", position: { order: 0 } },
    },
    {
      id: "m6",

      family_id: "family-demo-nguyen",

      branch_id: "branch-main",
      full_name: "Nguyễn Văn Bình",
      generation: 3,
      life_status: "LIVING",
      gender: "MALE",
      is_placeholder: false,
      spouses: [
        {
          id: "m6s",
          full_name: "Hoàng Thị Nga",
          life_status: "LIVING",
        },
      ],
      parent_ids: ["m3"],
      path: ["m1", "m3", "m6"],
      tree_logic: { branch_id: "branch-main", position: { order: 0 } },
      birth_year: 1960,
    },
    {
      id: "m7",

      family_id: "family-demo-nguyen",

      branch_id: "branch-main",
      full_name: "Nguyễn Thị Hương",
      generation: 4,
      life_status: "LIVING",
      gender: "FEMALE",
      is_placeholder: false,
      spouses: [],
      parent_ids: ["m4"],
      path: ["m1", "m2", "m4", "m7"],
      tree_logic: { branch_id: "branch-main", position: { order: 0 } },
      birth_year: 1985,
    },
    {
      id: "m8",

      family_id: "family-demo-nguyen",

      branch_id: "branch-main",
      full_name: "Nguyễn Văn Đức",
      generation: 4,
      life_status: "LIVING",
      gender: "MALE",
      is_huong_hoa: true,
      is_placeholder: false,
      spouses: [
        {
          id: "m8s",
          full_name: "Vũ Thị Lan",
          life_status: "LIVING",
        },
      ],
      parent_ids: ["m4"],
      path: ["m1", "m2", "m4", "m8"],
      tree_logic: { branch_id: "branch-main", position: { order: 0 } },
      birth_year: 1988,
    },
  ],
  relations: [
    { id: "r1", family_id: "family-demo-nguyen", branch_id: "branch-main", source: "m1", target: "m2", relationship_type: "BLOOD" },
    { id: "r2", family_id: "family-demo-nguyen", branch_id: "branch-main", source: "m1", target: "m3", relationship_type: "BLOOD" },
    { id: "r3", family_id: "family-demo-nguyen", branch_id: "branch-main", source: "m2", target: "m4", relationship_type: "BLOOD" },
    { id: "r4", family_id: "family-demo-nguyen", branch_id: "branch-main", source: "m2", target: "m5", relationship_type: "BLOOD" },
    { id: "r5", family_id: "family-demo-nguyen", branch_id: "branch-main", source: "m3", target: "m6", relationship_type: "ADOPTED" },
    { id: "r6", family_id: "family-demo-nguyen", branch_id: "branch-main", source: "m4", target: "m7", relationship_type: "BLOOD" },
    { id: "r7", family_id: "family-demo-nguyen", branch_id: "branch-main", source: "m4", target: "m8", relationship_type: "BLOOD" },
  ],
};
