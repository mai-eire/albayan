import { z } from "zod";
import { optionalText } from "@/lib/fields";
import { arabicProficiencies, genders, registrationReasons, relationships } from "@/lib/db/schema";

// One schema per wizard step, so the client can validate a step before moving on with the
// same rules the action applies to the whole thing.
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

// Kept as fields rather than a schema so the step, the whole application and the family's
// later corrections can each be built from them and carry the same rule below.
export const childFields = {
  firstName: z.string().trim().min(1, "Enter their first name").max(60),
  lastName: z.string().trim().min(1, "Enter their surname").max(60),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter their date of birth"),
  gender: z.enum(genders, { message: "Choose one" }),
  schoolYearGroup: optionalText(40),
  isHomeschooled: z.boolean(),
  arabicProficiency: z.enum(arabicProficiencies),
  // Chosen from a list or typed; stored as one comma-separated line, which is how a
  // teacher reads it on a register.
  allergies: z.array(z.string().trim().min(1).max(60)).max(10),
  medicalNotes: optionalText(1000),
  applicationNotes: optionalText(1000),
  // Null means "any day": the family has no preference and the office places them.
  preferredSessionId: z.number().int().nullable(),
  // The level by name ("Level 3"); a family may name a level without naming a day.
  preferredClassName: optionalText(60),
};

// A child taught at home has no weekday school year; everyone else must give one.
const hasSchoolYear = (v: { isHomeschooled: boolean; schoolYearGroup?: string | null }) =>
  v.isHomeschooled || Boolean(v.schoolYearGroup);
const schoolYearMessage = {
  message: "Tell us their school year, or tick that they're taught at home",
  path: ["schoolYearGroup"],
};

// Applies the rule to any schema carrying the child's fields (the step, the whole
// application, a family's later correction).
export function withSchoolYearRule<
  T extends z.ZodType<{ isHomeschooled: boolean; schoolYearGroup: string | null }>,
>(schema: T) {
  return schema.refine(hasSchoolYear, schoolYearMessage);
}

export const childStepSchema = withSchoolYearRule(z.object(childFields));

export const familyStepSchema = z.object({
  childCountry: z.string().trim().max(60).nullable(),
  guardianCountry: z.string().trim().max(60).nullable(),
  spokenLanguages: z.array(z.string().trim().min(1).max(40)).max(10),
  registrationReasons: z.array(z.enum(registrationReasons)),
  registrationReasonOther: optionalText(200),
});

export const applicationSchema = withSchoolYearRule(
  z.object({ ...guardianStepSchema.shape, ...childFields, ...familyStepSchema.shape }),
);

export type ApplicationInput = z.input<typeof applicationSchema>;
