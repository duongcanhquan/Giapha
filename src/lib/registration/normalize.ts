import { stripVietnameseDiacritics } from "@/lib/search/normalize";

/** Chuẩn hoá SĐT VN: bỏ ký tự lạ, 84xxxxxxxxx → 0xxxxxxxxx */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("84") && digits.length >= 11) {
    digits = `0${digits.slice(2)}`;
  }
  return digits;
}

export function normalizeKey(value: string): string {
  return stripVietnameseDiacritics(value).replace(/\s+/g, " ").trim();
}
