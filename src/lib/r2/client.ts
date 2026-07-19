import { S3Client } from "@aws-sdk/client-s3";

export type R2Env = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Public base URL (r2.dev hoặc custom domain), không có slash cuối */
  publicUrl: string;
};

export function getR2Env(): R2Env | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const publicUrl = process.env.R2_PUBLIC_URL?.trim().replace(/\/$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    return null;
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

export function isR2Configured(): boolean {
  return getR2Env() !== null;
}

export function missingR2EnvKeys(): string[] {
  const keys = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_URL",
  ] as const;
  return keys.filter((k) => !process.env[k]?.trim());
}

let cachedClient: S3Client | null = null;

export function getR2Client(): S3Client {
  const env = getR2Env();
  if (!env) {
    throw new Error(
      `Chưa cấu hình R2. Thiếu: ${missingR2EnvKeys().join(", ")}`,
    );
  }
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.accessKeyId,
        secretAccessKey: env.secretAccessKey,
      },
    });
  }
  return cachedClient;
}

/** Key ổn định — ghi đè khi upload lại */
export function memberAvatarKey(familyId: string, memberId: string): string {
  return `families/${familyId}/members/${memberId}/avatar.jpg`;
}

export function publicObjectUrl(key: string): string {
  const env = getR2Env();
  if (!env) throw new Error("R2 chưa cấu hình.");
  return `${env.publicUrl}/${key}`;
}
