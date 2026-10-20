/**
 * Helper to identify whether an employee is a Retainer based on their rank or employment status.
 * Per company policy / P.D. 851 exclusions, retainers can be excluded from 13th-month pay.
 */
export function isRetainerEmployee(employee: {
  rank?: string | null;
  employmentStatus?: string | null;
}): boolean {
  const isRankRetainer = employee.rank?.trim().toLowerCase() === "retainer";
  const isStatusRetainer = employee.employmentStatus?.toUpperCase() === "RETAINER";
  return Boolean(isRankRetainer || isStatusRetainer);
}
