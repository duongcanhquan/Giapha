/**
 * Seed gia phả họ Dương — ~500 người, nhiều chi nhánh, đầy đủ dâu/rể + địa chỉ.
 *
 * Chủ họ: kelvinduong.necor@gmail.com / 123456
 * Chạy:  npm run seed:duong
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { initializeApp } = require("firebase/app");
const {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} = require("firebase/auth");
const {
  getFirestore,
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
} = require("firebase/firestore");
const { Solar } = require("lunar-javascript");

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const OWNER_EMAIL = "kelvinduong.necor@gmail.com";
const OWNER_PASSWORD = "123456";
const FAMILY_NAME = "Dương";
const TARGET_MEMBERS = 500;
const RNG_SEED = 20260719;

/* ── branches ───────────────────────────────────────────────── */

const BRANCHES = [
  {
    id: "branch-main",
    name: "Chi chính (hương hỏa)",
    description: "Nhánh trưởng nam thừa hương hỏa từ thủy tổ Dương Văn Thọ",
  },
  {
    id: "branch-nhi",
    name: "Chi nhị — Đông Sơn",
    description: "Từ thứ nam đời 2, định cư làng Đông Sơn (Thanh Hóa)",
  },
  {
    id: "branch-ba",
    name: "Chi ba — Hà Trung",
    description: "Tách từ đời 4, định cư Hà Trung (Thanh Hóa)",
  },
  {
    id: "branch-tu",
    name: "Chi tư — Nam Định",
    description: "Di cư Nam Định cuối thế kỷ 19",
  },
  {
    id: "branch-nam",
    name: "Chi năm — Hà Nội",
    description: "Nhánh đô thị từ giữa thế kỷ 20",
  },
  {
    id: "branch-luc",
    name: "Chi lục — Nghệ An",
    description: "Nhánh phụ theo đường hôn nhân / nghề nghiệp",
  },
];

const BRANCH_MAIN = "branch-main";

/* Ban tự 15 đời */
const BAN = [
  "Thọ",
  "Vĩnh",
  "Phúc",
  "Đức",
  "Thành",
  "Công",
  "Đình",
  "Hữu",
  "Quốc",
  "Bảo",
  "Trung",
  "Hiếu",
  "Nghĩa",
  "Khoa",
  "Minh",
];

/* Số con mong muốn mỗi đời (điều chỉnh để tiến tới ~500) */
const TARGET_PER_GEN = [
  0, // unused
  1, 5, 12, 22, 32, 40, 45, 48, 50, 48, 45, 42, 38, 36, 36,
]; // sum ≈ 500

const MALE_GIVEN = [
  "Sơn", "Hải", "Long", "Cường", "Đạt", "Minh", "An", "Tài", "Kiên", "Công",
  "Đình", "Thuận", "Lộc", "Hữu", "Tín", "Dũng", "Quốc", "Phong", "Mạnh", "Bảo",
  "Vinh", "Hùng", "Trung", "Đức", "Tâm", "Hiếu", "Nghĩa", "Bình", "Lâm", "Tuấn",
  "Huy", "Nam", "Nhật", "Khang", "Bảo", "Phúc", "Khôi", "Hoàng", "Quân", "Thịnh",
  "Phát", "Thành", "Việt", "Hưng", "Khánh", "Toàn", "Sang", "Trí", "Nguyên", "Đăng",
  "Khoa", "Lợi", "Thắng", "Quang", "Hòa", "Bình", "Cường", "Thiện", "Phước", "Tùng",
];

const FEMALE_GIVEN = [
  "Lan", "Hoa", "Ngọc", "Mai", "Xuân", "Đào", "Yến", "Huệ", "Sen", "Loan",
  "Hương", "Nga", "Mỹ", "Bích", "Thanh", "Quế", "Tuyết", "Nhi", "Oanh", "Hà",
  "Dung", "Liên", "Hạnh", "Nhung", "Kim", "Thu", "Hằng", "Trang", "Linh", "An",
  "Chi", "Anh", "Vy", "My", "Ngân", "Uyên", "Thảo", "Nhiên", "Khánh", "Phương",
  "Diệu", "Tâm", "Vân", "Châu", "Thư", "Giang", "Trâm", "Quỳnh", "Huyền", "Nhàn",
];

const WIFE_SURNAMES = [
  "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng",
  "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đào", "Đinh", "Mai", "Trịnh",
  "Cao", "Tạ", "Lương", "Châu", "Tô",
];

const HUSBAND_SURNAMES = WIFE_SURNAMES.filter((s) => s !== "Dương");

const COURTESY = [
  "Ích Tâm", "Bá Lộc", "Văn Khoa", "Tử Phong", "Thanh Nhàn", "Quang Tiền",
  "Khắc Thành", "Văn Sơn", "Trọng Nghĩa", "Chính Tâm", "Quang Minh", "Văn Hòa",
  "Quốc Bảo", "An Ninh", "Hữu Đức", "Chính Nghĩa", "Hữu Lợi",
];

const POSTHUMOUS = [
  "Thuần Đức", "Cương Nghị", "Hiếu Nghĩa", "Cẩn Trực", "Ôn Hòa", "Trung Thuận",
  "Đôn Hậu", "Liêm Chính", "Uyên Mẫn", "Trinh Khiết", "Cần Kiệm", "Hiền Đức",
];

const VILLAGES = [
  { village: "Đông Sơn", district: "Đông Sơn", province: "Thanh Hóa" },
  { village: "Hà Trung", district: "Hà Trung", province: "Thanh Hóa" },
  { village: "Thiệu Hóa", district: "Thiệu Hóa", province: "Thanh Hóa" },
  { village: "Nga Sơn", district: "Nga Sơn", province: "Thanh Hóa" },
  { village: "Xuân Trường", district: "Xuân Trường", province: "Nam Định" },
  { village: "Giao Thủy", district: "Giao Thủy", province: "Nam Định" },
  { village: "Hải Hậu", district: "Hải Hậu", province: "Nam Định" },
  { village: "Đống Đa", district: "Đống Đa", province: "Hà Nội" },
  { village: "Cầu Giấy", district: "Cầu Giấy", province: "Hà Nội" },
  { village: "Thanh Xuân", district: "Thanh Xuân", province: "Hà Nội" },
  { village: "Vinh", district: "Vinh", province: "Nghệ An" },
  { village: "Diễn Châu", district: "Diễn Châu", province: "Nghệ An" },
  { village: "Nghi Lộc", district: "Nghi Lộc", province: "Nghệ An" },
  { village: "Hoằng Hóa", district: "Hoằng Hóa", province: "Thanh Hóa" },
  { village: "Quảng Xương", district: "Quảng Xương", province: "Thanh Hóa" },
];

const BRANCH_HOME = {
  "branch-main": 0,
  "branch-nhi": 0,
  "branch-ba": 1,
  "branch-tu": 4,
  "branch-nam": 7,
  "branch-luc": 10,
};

/* ── rng / helpers ──────────────────────────────────────────── */

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(RNG_SEED);

function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}

function int(min, max) {
  return min + Math.floor(rand() * (max - min + 1));
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function ymd(y, m, d) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function randomDate(year) {
  return ymd(year, int(1, 12), int(1, 28));
}

function lunarFromSolar(death) {
  if (!death) return null;
  const m = death.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  try {
    const lunar = Solar.fromYmd(+m[1], +m[2], +m[3]).getLunar();
    return `${lunar.getYear()}-${Math.abs(lunar.getMonth())}-${lunar.getDay()}`;
  } catch {
    return null;
  }
}

function loadEnvLocal() {
  const path = resolve(ROOT, ".env.local");
  if (!existsSync(path)) throw new Error("Thiếu .env.local");
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function addressFor(branchId, houseNo) {
  const idx = BRANCH_HOME[branchId] ?? 0;
  const base = VILLAGES[idx];
  const variant = VILLAGES[(idx + (houseNo % 3)) % VILLAGES.length];
  const place = houseNo % 2 === 0 ? base : variant;
  return `Số ${houseNo}, thôn/phường ${place.village}, ${place.district}, ${place.province}`;
}

function hometownFor(branchId) {
  const place = VILLAGES[BRANCH_HOME[branchId] ?? 0];
  return `${place.village}, ${place.district}, ${place.province}`;
}

function phoneFor(n) {
  const base = 900000000 + (n % 100000000);
  const s = String(base);
  return `09${s.slice(0, 2)} ${s.slice(2, 5)} ${s.slice(5, 8)}`;
}

/* ── build genealogy graph ──────────────────────────────────── */

/**
 * Person draft:
 * { key, parent, gen, gender, placeholder?, branch, is_huong_hoa?,
 *   given, birthYear, deathYear?, is_alive, spouses[], contact?, notes?, biography? }
 */

function buildPeople() {
  const people = [];
  const byGen = Array.from({ length: 16 }, () => []);
  let seq = 0;
  const usedMaleNames = new Set();
  const usedFemaleNames = new Set();

  function uniqueGiven(pool, used) {
    for (let attempt = 0; attempt < 80; attempt++) {
      const g = pick(pool);
      const tag = `${g}-${int(1, 9999)}`;
      if (!used.has(g) || attempt > 40) {
        // allow reuse of short given names across distant gens, but vary
        const name = attempt > 40 ? `${g}` : g;
        used.add(`${name}-${used.size}`);
        return name;
      }
    }
    return pick(pool) + String(int(1, 99));
  }

  function maleFull(gen, given) {
    const ban = BAN[gen - 1];
    // Pattern: Dương + ban + given  OR  Dương Văn/Thị style for early
    if (gen <= 2) return `Dương ${ban === "Thọ" ? "Văn Thọ" : ban + " " + given}`;
    return `Dương ${ban} ${given}`;
  }

  function femaleFull(gen, given) {
    const ban = BAN[gen - 1];
    return `Dương Thị ${ban} ${given}`;
  }

  // Gen 1 founder
  const founder = {
    key: "g01-01",
    parent: null,
    gen: 1,
    gender: "MALE",
    branch: BRANCH_MAIN,
    is_huong_hoa: true,
    given: "Thọ",
    full_name: "Dương Văn Thọ",
    birthYear: 1612,
    deathYear: 1689,
    is_alive: false,
    traditional_names: {
      birth: "Thọ",
      courtesy: "Ích Tâm",
      posthumous: "Thuần Đức",
    },
    spouses: [],
    biography:
      "Thủy tổ họ Dương tại làng Đông Sơn (Thanh Hóa). Đặt lệ hương hỏa và phân chi cho đời sau.",
    contact: {
      address: addressFor(BRANCH_MAIN, 1),
      phone: null,
      email: null,
      notes: "Mộ phần tại nghĩa trang làng Đông Sơn",
    },
  };
  people.push(founder);
  byGen[1].push(founder);

  // Foundation births for main heirs (~28y spacing)
  const heirBirth = [0, 1612];
  for (let g = 2; g <= 15; g++) {
    heirBirth[g] = heirBirth[g - 1] + int(26, 30);
  }
  // Cap so gen 15 around 2005-2015
  const drift = heirBirth[15] - 2008;
  if (Math.abs(drift) > 5) {
    for (let g = 2; g <= 15; g++) heirBirth[g] -= Math.round(drift * ((g - 1) / 14));
  }

  function makeSpouseDau(person, index) {
    const wifeSurname = pick(WIFE_SURNAMES);
    const given = pick(FEMALE_GIVEN);
    const birthY = person.birthYear + int(1, 6);
    const alive = person.is_alive && birthY >= 1945;
    let death = null;
    if (!alive && birthY < 1950) {
      death = randomDate(Math.min(birthY + int(55, 85), person.deathYear ?? birthY + 70));
    } else if (!alive) {
      death = randomDate(birthY + int(60, 90));
    }
    return {
      id: `sp-${person.key}-d${index}`,
      full_name: `${wifeSurname} Thị ${given}`,
      role: "DAU",
      maiden_name: wifeSurname,
      is_alive: alive,
      is_placeholder: false,
      birth: randomDate(birthY),
      death,
      hometown: hometownFor(person.branch),
      notes: `Dâu họ Dương — lấy ${person.full_name}`,
    };
  }

  function makeSpouseRe(person, index) {
    const husSurname = pick(HUSBAND_SURNAMES);
    const given = pick(MALE_GIVEN);
    const birthY = person.birthYear + int(-2, 4);
    const alive = person.is_alive && birthY >= 1945;
    return {
      id: `sp-${person.key}-r${index}`,
      full_name: `${husSurname} Văn ${given}`,
      role: "RE",
      maiden_name: null,
      is_alive: alive,
      is_placeholder: false,
      birth: randomDate(Math.max(1600, birthY)),
      death: alive ? null : randomDate(birthY + int(55, 80)),
      hometown: pick(VILLAGES).province,
      notes: `Rể — chồng của ${person.full_name}`,
    };
  }

  function assignBranch(parent, childIndex, gen) {
    // Seed new branches at specific points
    if (gen === 2 && childIndex === 1) return "branch-nhi";
    if (gen === 4 && childIndex === 2 && parent.branch === BRANCH_MAIN) return "branch-ba";
    if (gen === 8 && childIndex === 1 && parent.branch === BRANCH_MAIN) return "branch-tu";
    if (gen === 11 && childIndex === 1 && parent.branch === BRANCH_MAIN) return "branch-nam";
    if (gen === 6 && childIndex === 2 && parent.branch === "branch-nhi") return "branch-luc";
    return parent.branch;
  }

  // Expand gen by gen
  for (let gen = 2; gen <= 15; gen++) {
    const parents = byGen[gen - 1].filter((p) => !p.placeholder && p.gender === "MALE");
    const target = TARGET_PER_GEN[gen];
    let created = 0;
    const candidates = [];

    // Prefer huong hoa first, then main branch, then others
    const ordered = [...parents].sort((a, b) => {
      if (a.is_huong_hoa !== b.is_huong_hoa) return a.is_huong_hoa ? -1 : 1;
      if (a.branch === BRANCH_MAIN && b.branch !== BRANCH_MAIN) return -1;
      if (b.branch === BRANCH_MAIN && a.branch !== BRANCH_MAIN) return 1;
      return a.birthYear - b.birthYear;
    });

    // Decide children per father
    const quota = new Map();
    let remaining = target;
    for (let i = 0; i < ordered.length; i++) {
      const p = ordered[i];
      let n;
      if (p.is_huong_hoa) n = gen <= 10 ? int(3, 5) : int(2, 4);
      else if (p.branch === BRANCH_MAIN) n = int(2, 4);
      else n = int(1, 3);
      // leave room
      const leftParents = ordered.length - i;
      const maxForThis = Math.max(0, remaining - leftParents);
      n = Math.min(n, Math.max(1, maxForThis));
      if (remaining <= 0) n = 0;
      quota.set(p.key, n);
      remaining -= n;
    }
    // Distribute leftover
    let qi = 0;
    while (remaining > 0 && ordered.length > 0) {
      const p = ordered[qi % ordered.length];
      quota.set(p.key, (quota.get(p.key) || 0) + 1);
      remaining--;
      qi++;
    }

    for (const parent of ordered) {
      const n = quota.get(parent.key) || 0;
      for (let i = 0; i < n; i++) {
        seq++;
        const isFirst = i === 0 && parent.is_huong_hoa;
        const branch = assignBranch(parent, i, gen);
        const birthYear = Math.min(
          2024,
          Math.max(
            parent.birthYear + 16,
            (isFirst ? heirBirth[gen] : parent.birthYear + int(18, 38)) + int(-2, 2),
          ),
        );

        // Placeholder ~4% mid gens
        const isPlaceholder =
          gen >= 3 && gen <= 12 && !isFirst && rand() < 0.045;

        if (isPlaceholder) {
          const ph = {
            key: `g${pad2(gen)}-ph${seq}`,
            parent: parent.key,
            gen,
            gender: "UNKNOWN",
            placeholder: true,
            branch,
            birthYear: null,
            deathYear: null,
            is_alive: false,
            full_name: "",
            notes: `Khuyết danh đời ${gen} — sổ họ / bia mộ không còn tên húy.`,
            spouses: [],
          };
          people.push(ph);
          byGen[gen].push(ph);
          created++;
          continue;
        }

        // ~18% daughters among non-heir slots; heirs always male
        const isFemale = !isFirst && rand() < 0.18;
        const given = isFemale
          ? uniqueGiven(FEMALE_GIVEN, usedFemaleNames)
          : uniqueGiven(MALE_GIVEN, usedMaleNames);

        const isAlive = birthYear >= 1948 && (gen >= 13 || (gen >= 12 && rand() < 0.35));
        let deathYear = null;
        if (!isAlive) {
          const lifespan = gen <= 8 ? int(58, 82) : int(62, 88);
          deathYear = Math.min(2023, birthYear + lifespan);
          if (deathYear <= birthYear) deathYear = birthYear + 40;
        }

        const person = {
          key: `g${pad2(gen)}-${seq}`,
          parent: parent.key,
          gen,
          gender: isFemale ? "FEMALE" : "MALE",
          branch,
          is_huong_hoa: Boolean(isFirst),
          given,
          full_name: isFemale ? femaleFull(gen, given) : maleFull(gen, given),
          birthYear,
          deathYear,
          is_alive: isAlive,
          traditional_names: {
            birth: given,
            courtesy: isFirst || rand() < 0.35 ? pick(COURTESY) : null,
            posthumous: !isAlive && (isFirst || rand() < 0.3) ? pick(POSTHUMOUS) : null,
          },
          spouses: [],
          biography: isFirst
            ? `Trưởng nam hương hỏa đời ${gen} (${BAN[gen - 1]}). Thuộc ${BRANCHES.find((b) => b.id === branch)?.name || branch}.`
            : isFemale
              ? `Con gái đời ${gen} — ghi trong gia phả để nhớ nguồn.`
              : `Con trai đời ${gen}, ${BRANCHES.find((b) => b.id === branch)?.name || branch}.`,
          notes: null,
          contact: null,
        };

        // Marriage / dâu / rể
        if (!isFemale && birthYear <= 2005 && rand() < 0.88) {
          person.spouses.push(makeSpouseDau(person, 1));
          // occasional second wife in older gens
          if (gen <= 9 && rand() < 0.08) {
            person.spouses.push(makeSpouseDau(person, 2));
          }
        }
        if (isFemale && birthYear <= 2000 && rand() < 0.75) {
          person.spouses.push(makeSpouseRe(person, 1));
          person.notes = `Lấy chồng ${person.spouses[0].full_name}; vẫn về giỗ tổ hằng năm.`;
        }

        // Contact + address for most from gen 8+, all living
        if (isAlive || gen >= 8) {
          person.contact = {
            address: addressFor(branch, 10 + (seq % 800)),
            phone: isAlive || gen >= 12 ? phoneFor(seq) : null,
            email:
              isAlive && isFirst && gen === 13
                ? OWNER_EMAIL
                : isAlive && rand() < 0.15
                  ? `duong.${given.toLowerCase()}${seq % 100}@email.vn`
                  : null,
            notes: hometownFor(branch),
          };
        }

        people.push(person);
        byGen[gen].push(person);
        created++;
      }
    }

    // If under target, add cousins from secondary males who got 0 (shouldn't often happen)
    if (created < target * 0.85) {
      console.warn(`  Cảnh báo đời ${gen}: chỉ tạo ${created}/${target}`);
    }
  }

  // Top up to TARGET if short — attach extra children to recent living males
  let guard = 0;
  while (people.length < TARGET_MEMBERS && guard < 200) {
    guard++;
    const fathers = byGen[14].filter((p) => p.gender === "MALE" && !p.placeholder);
    if (!fathers.length) break;
    const parent = pick(fathers);
    seq++;
    const given = uniqueGiven(MALE_GIVEN, usedMaleNames);
    const birthYear = int(2005, 2018);
    const person = {
      key: `g15-extra-${seq}`,
      parent: parent.key,
      gen: 15,
      gender: "MALE",
      branch: parent.branch,
      is_huong_hoa: false,
      given,
      full_name: maleFull(15, given),
      birthYear,
      deathYear: null,
      is_alive: true,
      traditional_names: { birth: given, courtesy: null, posthumous: null },
      spouses: [],
      biography: `Đời 15 — bổ sung nhánh ${parent.branch}.`,
      contact: {
        address: addressFor(parent.branch, 900 + (seq % 99)),
        phone: phoneFor(seq),
        email: null,
        notes: hometownFor(parent.branch),
      },
    };
    people.push(person);
    byGen[15].push(person);
  }

  // Trim if over (remove non-heir young leaves without children)
  if (people.length > TARGET_MEMBERS + 20) {
    // keep as-is near target; generator aims ~500
  }

  // Attach founder wife
  founder.spouses = [
    {
      id: "sp-g01-d1",
      full_name: "Nguyễn Thị Lan",
      role: "DAU",
      maiden_name: "Nguyễn",
      is_alive: false,
      birth: "1618-05-12",
      death: "1692-11-03",
      hometown: hometownFor(BRANCH_MAIN),
      notes: "Chính thất thủy tổ",
    },
  ];

  return { people, byGen };
}

function validate(people) {
  const keys = new Set(people.map((p) => p.key));
  if (keys.size !== people.length) throw new Error("Trùng key");
  for (const p of people) {
    if (p.parent && !keys.has(p.parent)) {
      throw new Error(`Parent missing: ${p.key} -> ${p.parent}`);
    }
    if (!p.placeholder) {
      if (!p.full_name) throw new Error(`Thiếu tên: ${p.key}`);
      if (!p.birthYear) throw new Error(`Thiếu năm sinh: ${p.key}`);
      if (p.parent) {
        const parent = people.find((x) => x.key === p.parent);
        if (parent && !parent.placeholder && parent.birthYear) {
          const gap = p.birthYear - parent.birthYear;
          if (gap < 15 || gap > 60) {
            throw new Error(
              `Khoảng cách đời bất thường ${p.key}: ${gap} năm (cha ${parent.birthYear} → ${p.birthYear})`,
            );
          }
        }
      }
    }
  }
  const gens = new Set(people.map((p) => p.gen));
  for (let g = 1; g <= 15; g++) {
    if (!gens.has(g)) throw new Error(`Thiếu đời ${g}`);
  }
  const hh = people.filter((p) => p.is_huong_hoa);
  if (hh.length !== 15) throw new Error(`Hương hỏa=${hh.length}, cần 15`);
}

/* ── firebase IO ────────────────────────────────────────────── */

async function ensureOwner(auth) {
  try {
    const cred = await signInWithEmailAndPassword(auth, OWNER_EMAIL, OWNER_PASSWORD);
    console.log(`✓ Đăng nhập: ${OWNER_EMAIL}`);
    return cred.user;
  } catch (err) {
    if (
      err?.code === "auth/user-not-found" ||
      err?.code === "auth/invalid-credential" ||
      err?.code === "auth/wrong-password"
    ) {
      try {
        const created = await createUserWithEmailAndPassword(
          auth,
          OWNER_EMAIL,
          OWNER_PASSWORD,
        );
        await updateProfile(created.user, { displayName: "Chủ họ Dương" });
        console.log(`✓ Tạo tài khoản: ${OWNER_EMAIL}`);
        return created.user;
      } catch (e) {
        if (e?.code === "auth/email-already-in-use") {
          throw new Error("Email đã tồn tại nhưng sai mật khẩu 123456.");
        }
        throw e;
      }
    }
    throw err;
  }
}

async function deleteOwnedDuong(db, uid) {
  const snap = await getDocs(
    query(collection(db, "families"), where("owner_id", "==", uid)),
  );
  for (const fam of snap.docs) {
    const name = String(fam.data().name || "");
    if (name !== FAMILY_NAME && !name.includes("Dương")) continue;
    const familyId = fam.id;
    console.log(`… Xóa gia phả cũ: ${name} (${familyId})`);
    const members = await getDocs(
      query(collection(db, "family_members"), where("family_id", "==", familyId)),
    );
    const relations = await getDocs(
      query(collection(db, "family_relations"), where("family_id", "==", familyId)),
    );

    const contactRefs = [];
    for (const m of members.docs) {
      contactRefs.push(doc(db, "family_members", m.id, "sensitive", "contact"));
    }
    for (let i = 0; i < contactRefs.length; i += 400) {
      const batch = writeBatch(db);
      for (const r of contactRefs.slice(i, i + 400)) batch.delete(r);
      try {
        await batch.commit();
      } catch {
        // contact có thể không tồn tại
      }
    }

    const refs = [
      ...members.docs.map((d) => d.ref),
      ...relations.docs.map((d) => d.ref),
      fam.ref,
    ];
    for (let i = 0; i < refs.length; i += 400) {
      const batch = writeBatch(db);
      for (const r of refs.slice(i, i + 400)) batch.delete(r);
      await batch.commit();
    }
  }
}

async function writeTree(db, uid, people) {
  const idMap = new Map();
  for (const p of people) {
    idMap.set(p.key, doc(collection(db, "family_members")).id);
  }

  const familyRef = doc(collection(db, "families"));
  const familyId = familyRef.id;

  const writes = [];
  writes.push({
    ref: familyRef,
    data: {
      name: FAMILY_NAME,
      owner_id: uid,
      created_at: serverTimestamp(),
      settings: {
        description:
          "Gia phả họ Dương — mẫu lớn ~500 người, 15 đời, 6 chi nhánh, đầy đủ dâu/rể và địa chỉ.",
        default_branch_id: BRANCH_MAIN,
        branches: BRANCHES,
        theme: {
          primary_color: "#7a1f1f",
          accent_color: "#b8952d",
          surface_color: "#e4e8e5",
          background_image: null,
        },
      },
    },
  });

  for (const p of people) {
    const id = idMap.get(p.key);
    const parentId = p.parent ? idMap.get(p.parent) : null;
    const path = [];
    let cursor = p;
    const chain = [];
    while (cursor) {
      chain.unshift(idMap.get(cursor.key));
      cursor = cursor.parent ? people.find((x) => x.key === cursor.parent) : null;
    }
    path.push(...chain);

    const deathDate =
      p.placeholder || p.is_alive
        ? null
        : p.deathYear
          ? randomDate(p.deathYear)
          : null;

    const member = {
      id,
      family_id: familyId,
      full_name: p.placeholder ? "" : p.full_name,
      traditional_names: p.traditional_names || {},
      status: {
        is_alive: Boolean(p.is_alive),
        is_placeholder: Boolean(p.placeholder),
      },
      dates: {
        birth: p.placeholder || !p.birthYear ? null : randomDate(p.birthYear),
        death: deathDate,
        lunar_death: deathDate ? lunarFromSolar(deathDate) : null,
      },
      tree_logic: {
        parent_id: parentId,
        path,
        branch_id: p.branch || BRANCH_MAIN,
        relationship_type: "BLOOD",
        position: { order: p.gen },
      },
      spouses: (p.spouses || []).map((s) => ({
        id: s.id,
        full_name: s.full_name,
        role: s.role || "SPOUSE",
        maiden_name: s.maiden_name ?? null,
        is_alive: s.is_alive !== false,
        is_placeholder: false,
        birth: s.birth ?? null,
        death: s.death ?? null,
        hometown: s.hometown ?? null,
        notes: s.notes ?? null,
      })),
      gender: p.placeholder ? "UNKNOWN" : p.gender,
      is_huong_hoa: Boolean(p.is_huong_hoa),
      biography: p.biography || null,
      notes: p.notes || (p.placeholder ? "Khuyết danh" : null),
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };

    writes.push({ ref: doc(db, "family_members", id), data: member });

    if (parentId) {
      const relRef = doc(collection(db, "family_relations"));
      writes.push({
        ref: relRef,
        data: {
          id: relRef.id,
          family_id: familyId,
          branch_id: p.branch || BRANCH_MAIN,
          source: parentId,
          target: id,
          relationship_type: "BLOOD",
        },
      });
    }

    if (p.contact) {
      writes.push({
        ref: doc(db, "family_members", id, "sensitive", "contact"),
        data: {
          phone: p.contact.phone ?? null,
          address: p.contact.address ?? null,
          email: p.contact.email ?? null,
          notes: p.contact.notes ?? null,
        },
      });
    }
  }

  for (let i = 0; i < writes.length; i += 400) {
    const batch = writeBatch(db);
    for (const w of writes.slice(i, i + 400)) batch.set(w.ref, w.data);
    await batch.commit();
    console.log(
      `✓ Batch ${Math.floor(i / 400) + 1} (${Math.min(i + 400, writes.length)}/${writes.length})`,
    );
  }

  return familyId;
}

async function main() {
  loadEnvLocal();
  console.log("——— Sinh dữ liệu gia phả ——");
  const { people, byGen } = buildPeople();
  validate(people);

  let spouseCount = 0;
  let dau = 0;
  let re = 0;
  let withContact = 0;
  for (const p of people) {
    for (const s of p.spouses || []) {
      spouseCount++;
      if (s.role === "DAU") dau++;
      if (s.role === "RE") re++;
    }
    if (p.contact) withContact++;
  }

  for (let g = 1; g <= 15; g++) {
    console.log(`  Đời ${String(g).padStart(2, "0")}: ${byGen[g].length}`);
  }
  console.log(`  Thành viên cây: ${people.length}`);
  console.log(`  Dâu/rể (spouses): ${spouseCount} (dâu=${dau}, rể=${re})`);
  console.log(`  Có địa chỉ/liên hệ: ${withContact}`);
  console.log(`  Tổng tên riêng ≈ ${people.filter((p) => !p.placeholder).length + spouseCount}`);
  console.log("———");

  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (!config.apiKey || !config.projectId) {
    throw new Error("Thiếu Firebase config trong .env.local");
  }

  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const user = await ensureOwner(auth);
  await deleteOwnedDuong(db, user.uid);
  const familyId = await writeTree(db, user.uid, people);

  console.log("———");
  console.log("✓ Seed ~500 người hoàn tất");
  console.log(`  Family ID:  ${familyId}`);
  console.log(`  Dashboard:  /dashboard/${familyId}`);
  console.log(`  Cây public: /tree/${familyId}`);
  console.log(`  Login:      ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
  console.log("———");
}

main().catch((err) => {
  console.error("Seed thất bại:");
  console.error(err?.message || err);
  process.exit(1);
});
