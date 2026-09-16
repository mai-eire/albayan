// Age is computed, never stored. Dates are YYYY-MM-DD strings.
export function ageOn(dateOfBirth: string, on: string): number {
  const [by, bm, bd] = dateOfBirth.split("-").map(Number);
  const [y, m, d] = on.split("-").map(Number);
  let age = y - by;
  if (m < bm || (m === bm && d < bd)) age -= 1;
  return Math.max(0, age);
}
