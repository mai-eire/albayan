import { z } from "zod";
import { arabicProficiencies, genders, registrationReasons, relationships } from "@/lib/db/schema";

// One schema per wizard step, so the client can validate a step before moving on with the
// same rules the action applies to the whole thing.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

export const guardianStepSchema = z.object({
  relationship: z.enum(relationships, { message: "Tell us how you're related to the child" }),
  addressLine1: z.string().trim().min(1, "Enter your address").max(120),
  addressLine2: optionalText(120),
  city: z.string().trim().min(1, "Enter your town or city").max(60),
  postalCode: z.string().trim().min(3, "Enter your Eircode").max(12),
  emergencyContactName: z.string().trim().min(2, "Enter a name").max(80),
  emergencyContactPhone: z.string().trim().min(6, "Enter a phone number").max(30),
  emergencyContactRelationship: z.string().trim().min(2, "e.g. aunt, neighbour").max(40),
});

export const childStepSchema = z.object({
  firstName: z.string().trim().min(1, "Enter their first name").max(60),
  lastName: z.string().trim().min(1, "Enter their surname").max(60),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter their date of birth"),
  gender: z.enum(genders, { message: "Choose one" }),
  schoolYearGroup: optionalText(40),
  arabicProficiency: z.enum(arabicProficiencies),
  allergies: optionalText(500),
  medicalNotes: optionalText(1000),
  preferredSessionId: z.number({ error: "Choose a day" }).int(),
  preferredClassId: z.number().int().nullable(),
});

export const familyStepSchema = z.object({
  childEthnicity: z.string().trim().max(60).nullable(),
  guardianEthnicity: z.string().trim().max(60).nullable(),
  spokenLanguages: z.array(z.string().trim().min(1).max(40)).max(10),
  registrationReasons: z.array(z.enum(registrationReasons)),
  registrationReasonOther: optionalText(200),
});

export const applicationSchema = guardianStepSchema.merge(childStepSchema).merge(familyStepSchema);

export type ApplicationInput = z.input<typeof applicationSchema>;
