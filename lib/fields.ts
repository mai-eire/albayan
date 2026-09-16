import { z } from "zod";

// An optional free-text field: trims, treats "" and null alike, stores null when empty.
export const optionalText = (max: number) =>
  z
    .string()
    .nullable()
    .transform((v) => v?.trim() || null)
    .refine((v) => v === null || v.length <= max, { message: `Use at most ${max} characters` });
