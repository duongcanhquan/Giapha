import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadServiceAccount(): ServiceAccount | null {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    try {
      return JSON.parse(json) as ServiceAccount;
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON không phải JSON hợp lệ.");
    }
  }
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (path) {
    const raw = readFileSync(resolve(process.cwd(), path), "utf8");
    return JSON.parse(raw) as ServiceAccount;
  }
  return null;
}

let app: App | null = null;

export function getAdminApp(): App {
  if (app) return app;
  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return app;
  }

  const sa = loadServiceAccount();
  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();

  if (!sa) {
    throw new Error(
      "Thiếu FIREBASE_SERVICE_ACCOUNT_JSON (hoặc PATH) để xác thực upload ảnh.",
    );
  }

  app = initializeApp({
    credential: cert(sa),
    projectId: projectId || sa.projectId,
  });
  return app;
}

export async function verifyBearerUid(
  authorization: string | null,
): Promise<string> {
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Thiếu Authorization Bearer token.");
  }
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) throw new Error("Token trống.");
  const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
  return decoded.uid;
}
