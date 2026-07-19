import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { verifyBearerUid } from "@/lib/firebase/admin";
import {
  getR2Client,
  getR2Env,
  isR2Configured,
  memberAvatarKey,
  missingR2EnvKeys,
  publicObjectUrl,
} from "@/lib/r2/client";

export const runtime = "nodejs";

const MAX_BYTES = 900_000; // sau khi client đã resize JPEG ~512px

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: Request) {
  try {
    if (!isR2Configured()) {
      return jsonError(
        `Chưa cấu hình R2. Thêm vào .env: ${missingR2EnvKeys().join(", ")}`,
        503,
      );
    }

    await verifyBearerUid(request.headers.get("authorization"));

    const form = await request.formData();
    const file = form.get("file");
    const memberId = String(form.get("memberId") ?? "").trim();
    const familyId = String(form.get("familyId") ?? "").trim();

    if (!memberId || !familyId) {
      return jsonError("Thiếu memberId hoặc familyId.", 400);
    }
    if (!(file instanceof Blob)) {
      return jsonError("Thiếu file ảnh.", 400);
    }
    if (file.size > MAX_BYTES) {
      return jsonError("Ảnh sau khi nén vẫn quá lớn. Thử ảnh khác.", 400);
    }

    const contentType = file.type || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return jsonError("File phải là ảnh.", 400);
    }

    const key = memberAvatarKey(familyId, memberId);
    const buffer = Buffer.from(await file.arrayBuffer());
    const env = getR2Env()!;

    await getR2Client().send(
      new PutObjectCommand({
        Bucket: env.bucket,
        Key: key,
        Body: buffer,
        ContentType: "image/jpeg",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    const photoUrl = `${publicObjectUrl(key)}?v=${Date.now()}`;
    return NextResponse.json({ ok: true, photo_url: photoUrl, key });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Upload thất bại.";
    const status =
      message.includes("Bearer") || message.includes("Token")
        ? 401
        : message.includes("SERVICE_ACCOUNT") || message.includes("R2")
          ? 503
          : 500;
    return jsonError(message, status);
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isR2Configured()) {
      return jsonError(
        `Chưa cấu hình R2. Thêm vào .env: ${missingR2EnvKeys().join(", ")}`,
        503,
      );
    }

    await verifyBearerUid(request.headers.get("authorization"));

    const body = (await request.json()) as {
      memberId?: string;
      familyId?: string;
    };
    const memberId = String(body.memberId ?? "").trim();
    const familyId = String(body.familyId ?? "").trim();
    if (!memberId || !familyId) {
      return jsonError("Thiếu memberId hoặc familyId.", 400);
    }

    const key = memberAvatarKey(familyId, memberId);
    const env = getR2Env()!;
    await getR2Client().send(
      new DeleteObjectCommand({
        Bucket: env.bucket,
        Key: key,
      }),
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Xoá ảnh thất bại.";
    const status =
      message.includes("Bearer") || message.includes("Token") ? 401 : 500;
    return jsonError(message, status);
  }
}
