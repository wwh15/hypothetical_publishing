/**
 * Four quarters ending at the current date.
 * E.g. if today is Feb 2026, returns 2025 Q2 – 2026 Q1.
 */
export function getDefaultQuarterRange(): {
  startQuarter: number;
  startYear: number;
  endQuarter: number;
  endYear: number;
} {
  const now = new Date();
  const endYear = now.getFullYear();
  const month = now.getMonth() + 1; // 1–12
  const endQuarter = Math.ceil(month / 3) as 1 | 2 | 3 | 4;

  const totalQuarters = endYear * 4 + (endQuarter - 1);
  const startTotalQuarters = totalQuarters - 3;
  const startYear = Math.floor(startTotalQuarters / 4);
  const startQuarter = (startTotalQuarters % 4) + 1;

  return {
    startQuarter,
    startYear,
    endQuarter,
    endYear,
  };
}

export const QUARTERS = [1, 2, 3, 4] as const;

/** Years for the report range: from 2000 to current year + 1 */
export function getReportYears(): number[] {
  const end = new Date().getFullYear() + 1;
  const years: number[] = [];
  for (let y = 2000; y <= end; y++) years.push(y);
  return years;
}
