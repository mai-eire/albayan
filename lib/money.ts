import { z } from "zod";

// Money is integer euro cents in the database and euros everywhere people see it.

// Accepts "250", "250.50", "€1,250.00", 250 → cents. Throws on anything else.
export function eurosToCents(input: string | number): number {
  const text = String(input).replace(/[€,\s]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) throw new Error(`Not an amount in euros: ${input}`);
  const [whole, fraction = ""] = text.split(".");
  const sign = whole.startsWith("-") ? -1 : 1;
  const cents = Math.abs(Number(whole)) * 100 + Number(fraction.padEnd(2, "0"));
  return sign * cents;
}

// "€250", "€250.50", "−€10" — never "250.00 EUR".
export function formatEuros(cents: number): string {
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100).toLocaleString("en-IE");
  const rest = abs % 100;
  const amount = rest ? `€${euros}.${String(rest).padStart(2, "0")}` : `€${euros}`;
  return cents < 0 ? `−${amount}` : amount;
}

// Form field for an amount typed in euros; parses to non-negative cents.
export const eurosField = z
  .string()
  .trim()
  .transform((v, ctx) => {
    try {
      const cents = eurosToCents(v || "0");
      if (cents < 0) throw new Error();
      return cents;
    } catch {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 250 or 250.50" });
      return z.NEVER;
    }
  });
