import { Solar } from "lunar-javascript";

export type LunarDeathDate = {
  /** Chuỗi âm lịch dạng "YYYY-M-D" */
  iso_like: string;
  /** Hiển thị tiếng Việt, ví dụ "ngày 22 tháng 2 năm Ất Mùi (1955)" */
  display: string;
  year: number;
  month: number;
  day: number;
  /** Tháng âm có nhuận hay không */
  leap: boolean;
  year_ganzhi?: string;
};

function parseDeathDate(deathDate: string | Date): {
  y: number;
  m: number;
  d: number;
} | null {
  if (deathDate instanceof Date) {
    if (Number.isNaN(deathDate.getTime())) return null;
    return {
      y: deathDate.getFullYear(),
      m: deathDate.getMonth() + 1,
      d: deathDate.getDate(),
    };
  }

  const trimmed = deathDate.trim();
  // YYYY-MM-DD hoặc YYYY/MM/DD
  const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!match) return null;
  return {
    y: Number(match[1]),
    m: Number(match[2]),
    d: Number(match[3]),
  };
}

/**
 * Dịch `death_date` (dương lịch) → thông tin ngày giỗ âm lịch.
 */
export function toLunarDeathDate(
  deathDate: string | Date | null | undefined,
): LunarDeathDate | null {
  if (!deathDate) return null;
  const parts = parseDeathDate(deathDate);
  if (!parts) return null;

  try {
    const solar = Solar.fromYmd(parts.y, parts.m, parts.d);
    const lunar = solar.getLunar();
    const year = lunar.getYear();
    const month = lunar.getMonth();
    const day = lunar.getDay();
    const leap = month < 0;
    const absMonth = Math.abs(month);
    const yearGanzhi = lunar.getYearInGanZhi?.() as string | undefined;
    const monthCn = lunar.getMonthInChinese();
    const dayCn = lunar.getDayInChinese();

    const display = [
      `ngày ${dayCn}`,
      `tháng ${monthCn}${leap ? " (nhuận)" : ""}`,
      yearGanzhi ? `năm ${yearGanzhi}` : `năm ${year}`,
      `(${year})`,
    ].join(" ");

    return {
      iso_like: `${year}-${absMonth}-${day}`,
      display,
      year,
      month: absMonth,
      day,
      leap,
      year_ganzhi: yearGanzhi,
    };
  } catch {
    return null;
  }
}

/** Alias rõ nghĩa theo yêu cầu nghiệp vụ */
export function deathDateToLunarDeathDate(
  death_date: string | Date | null | undefined,
): LunarDeathDate | null {
  return toLunarDeathDate(death_date);
}

/**
 * Form tính ngày giỗ: nhập dương lịch → trả về âm lịch để lưu/hiển thị `lunar_death_date`.
 */
export function computeAnniversary(death_date: string): {
  death_date: string;
  lunar_death_date: string | null;
  lunar_display: string | null;
} {
  const lunar = toLunarDeathDate(death_date);
  return {
    death_date,
    lunar_death_date: lunar?.iso_like ?? null,
    lunar_display: lunar?.display ?? null,
  };
}
