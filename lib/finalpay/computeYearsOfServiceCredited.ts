/**
 * Labor Code fractional-year rule (applies to both separation and
 * retirement pay): a fraction of at least 6 months counts as 1 whole year;
 * less than 6 months doesn't count at all.
 */
export function computeYearsOfServiceCredited(dateHired: Date, dateSeparated: Date): number {
  const totalMonths = monthsBetween(dateHired, dateSeparated);
  const wholeYears = Math.floor(totalMonths / 12);
  const remainingMonths = totalMonths % 12;
  return remainingMonths >= 6 ? wholeYears + 1 : wholeYears;
}

function monthsBetween(start: Date, end: Date): number {
  let months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth());
  if (end.getUTCDate() < start.getUTCDate()) {
    months -= 1;
  }
  return Math.max(months, 0);
}
