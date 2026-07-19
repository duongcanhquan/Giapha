/** Client-side: crop giữa + resize vuông rồi encode JPEG thống nhất. */

export const AVATAR_SIZE = 512;
export const AVATAR_MIME = "image/jpeg";
export const AVATAR_QUALITY = 0.82;
export const AVATAR_MAX_INPUT_BYTES = 12 * 1024 * 1024; // 12MB trước khi resize

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không đọc được ảnh."));
    };
    img.src = url;
  });
}

/**
 * Cắt giữa thành vuông, scale về `size`, xuất JPEG Blob.
 */
export async function prepareAvatarBlob(
  file: File,
  size = AVATAR_SIZE,
): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Chỉ chấp nhận file ảnh (JPG, PNG, WEBP…).");
  }
  if (file.size > AVATAR_MAX_INPUT_BYTES) {
    throw new Error("Ảnh quá lớn (tối đa 12MB). Hãy chọn ảnh nhỏ hơn.");
  }

  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  if (side < 32) {
    throw new Error("Ảnh quá nhỏ để cắt avatar.");
  }
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ canvas.");

  ctx.fillStyle = "#f5f0e8";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, AVATAR_MIME, AVATAR_QUALITY),
  );
  if (!blob) throw new Error("Không tạo được ảnh JPEG.");
  return blob;
}

export function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (
    (parts[0]![0] ?? "") + (parts[parts.length - 1]![0] ?? "")
  ).toUpperCase();
}
