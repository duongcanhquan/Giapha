/**
 * Sync NEXT_PUBLIC_FIREBASE_* from .env.local → Vercel
 * using `vercel env add --value --yes --force --no-sensitive`
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];
const ENVS = ["production", "preview", "development"];

function loadLocal() {
  const path = resolve(ROOT, ".env.local");
  if (!existsSync(path)) throw new Error("Thiếu .env.local");
  const map = new Map();
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
    map.set(key, val);
  }
  return map;
}

function run(args) {
  const res = spawnSync("npx.cmd", ["vercel", ...args], {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
  });
  return res;
}

const local = loadLocal();
for (const k of KEYS) {
  const v = local.get(k);
  if (!v) throw new Error(`Thiếu ${k} trong .env.local`);
}

for (const envName of ENVS) {
  for (const key of KEYS) {
    const value = local.get(key);
    console.log(`… ${envName}/${key} (len=${value.length})`);
    run(["env", "rm", key, envName, "--yes"]);
    const add = run([
      "env",
      "add",
      key,
      envName,
      "--value",
      value,
      "--yes",
      "--force",
      "--no-sensitive",
    ]);
    if (add.status !== 0) {
      console.error("stdout:", add.stdout);
      console.error("stderr:", add.stderr);
      console.error("error:", add.error);
      throw new Error(`Fail ${key} ${envName}`);
    }
  }
}

console.log("VERCEL_ENV_SYNCED");
