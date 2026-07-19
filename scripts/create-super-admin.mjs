/**
 * One-shot: tạo Super Admin Firebase Auth + custom claim.
 *
 * Email:    duongcanhquan@admin.local
 * Password: 123456
 * Claim:    { role: 'super_admin' }
 *
 * Cách chạy:
 *   1. Tải service account JSON từ Firebase Console
 *      (Project settings → Service accounts → Generate new private key)
 *   2. export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *      hoặc: export FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccount.json
 *   3. npm run admin:create-super
 *
 * (Tuỳ chọn) FIREBASE_PROJECT_ID=your-project-id
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

const EMAIL = "duongcanhquan@admin.local";
const PASSWORD = "123456";
const CLAIMS = { role: "super_admin" };

function loadCredential() {
  const explicit =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (explicit) {
    const path = resolve(explicit);
    if (!existsSync(path)) {
      throw new Error(`Không tìm thấy service account: ${path}`);
    }
    const json = JSON.parse(readFileSync(path, "utf8"));
    return admin.credential.cert(json);
  }

  // Application Default Credentials (gcloud / Cloud Run)
  return admin.credential.applicationDefault();
}

async function main() {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: loadCredential(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }

  const auth = admin.auth();
  let user;

  try {
    user = await auth.getUserByEmail(EMAIL);
    console.log(`✓ User đã tồn tại: ${user.uid}`);
    await auth.updateUser(user.uid, { password: PASSWORD, emailVerified: true });
    console.log("✓ Đã cập nhật mật khẩu");
  } catch (err) {
    if (err?.code !== "auth/user-not-found") throw err;
    user = await auth.createUser({
      email: EMAIL,
      password: PASSWORD,
      emailVerified: true,
      displayName: "Super Admin",
      disabled: false,
    });
    console.log(`✓ Đã tạo user mới: ${user.uid}`);
  }

  await auth.setCustomUserClaims(user.uid, CLAIMS);
  console.log(`✓ Custom claims: ${JSON.stringify(CLAIMS)}`);

  const verified = await auth.getUser(user.uid);
  console.log("———");
  console.log("Super Admin sẵn sàng:");
  console.log(`  email:  ${EMAIL}`);
  console.log(`  uid:    ${verified.uid}`);
  console.log(`  claims: ${JSON.stringify(verified.customClaims ?? {})}`);
  console.log("———");
  console.log("Đăng nhập lại (hoặc refresh token) để claim có hiệu lực trên client.");
}

main().catch((error) => {
  console.error("Tạo Super Admin thất bại:");
  console.error(error?.message || error);
  if (
    String(error?.message || "").includes("Could not load the default credentials") ||
    String(error?.message || "").includes("Unable to detect a Project Id")
  ) {
    console.error(`
Hướng dẫn:
  export FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccount.json
  # hoặc
  export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
  npm run admin:create-super
`);
  }
  process.exit(1);
});
