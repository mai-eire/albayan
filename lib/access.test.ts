import { describe, expect, it } from "vitest";
import {
  canEditRegister,
  canViewResource,
  AccessDenied,
  canViewStudent,
  isGuardianOf,
  requireAdmin,
  requireGuardian,
  requireStudent,
  requireTeacher,
  teachesClass,
  teachesSubjectIn,
  type ClassFacts,
  type StudentFacts,
} from "./access";
import { areasFor, type CurrentUser } from "./current-user";

function user(partial: Partial<Omit<CurrentUser, "areas">> & { id: number }): CurrentUser {
  const base = {
    name: "Someone",
    email: "someone@example.com",
    isAdmin: false,
    phone: null,
    emailVerified: true,
    emailNotifications: true,
    mustChangePassword: false,
    guardian: null,
    teacher: null,
    student: null,
    ...partial,
  };
  return { ...base, areas: areasFor(base) };
}

const admin = user({ id: 1, isAdmin: true });
const classTeacher = user({ id: 2, teacher: { id: 10, isActive: true } });
const quranTeacher = user({ id: 3, teacher: { id: 11, isActive: true } });
const otherTeacher = user({ id: 4, teacher: { id: 12, isActive: true } });
const formerTeacher = user({ id: 5, teacher: { id: 13, isActive: false } });
const mother = user({ id: 6, guardian: { id: 20 } });
const otherParent = user({ id: 7, guardian: { id: 21 } });
const self = user({ id: 8, student: { id: 30, studentId: "ALB-26-0001", firstName: "A" } });
const otherStudent = user({ id: 9, student: { id: 31, studentId: "ALB-26-0002", firstName: "B" } });
const nobody = user({ id: 10 });
const teacherParent = user({ id: 11, teacher: { id: 14, isActive: true }, guardian: { id: 22 } });

const level2: ClassFacts = {
  id: 100,
  classTeacherId: 10,
  assignments: [
    { subjectId: "quran", teacherId: 11 },
    { subjectId: "arabic", teacherId: 10 },
  ],
};

const enrolled: StudentFacts = { id: 30, userId: 8, guardianIds: [20, 22], activeClass: level2 };
const left: StudentFacts = { id: 32, userId: null, guardianIds: [20], activeClass: null };

describe("areasFor", () => {
  it("derives areas in landing order", () => {
    expect(admin.areas).toEqual(["admin"]);
    expect(teacherParent.areas).toEqual(["teacher", "family"]);
    expect(formerTeacher.areas).toEqual([]);
    expect(nobody.areas).toEqual([]);
    expect(self.areas).toEqual(["student"]);
  });
});

describe("require*", () => {
  it("admits only the matching role", () => {
    expect(requireAdmin(admin)).toBe(admin);
    expect(() => requireAdmin(classTeacher)).toThrow(AccessDenied);
    expect(requireTeacher(classTeacher).id).toBe(10);
    expect(() => requireTeacher(formerTeacher)).toThrow(AccessDenied);
    expect(() => requireTeacher(admin)).toThrow(AccessDenied);
    expect(requireGuardian(mother).id).toBe(20);
    expect(() => requireGuardian(self)).toThrow(AccessDenied);
    expect(requireStudent(self).id).toBe(30);
    expect(() => requireStudent(nobody)).toThrow(AccessDenied);
  });
});

describe("teachesClass", () => {
  it("is true for the class teacher and any subject teacher, false otherwise", () => {
    expect(teachesClass(classTeacher, level2)).toBe(true);
    expect(teachesClass(quranTeacher, level2)).toBe(true);
    expect(teachesClass(otherTeacher, level2)).toBe(false);
    expect(teachesClass(formerTeacher, level2)).toBe(false);
    expect(teachesClass(admin, level2)).toBe(false);
    expect(teachesClass(mother, level2)).toBe(false);
  });
});

describe("teachesSubjectIn", () => {
  it("needs the (class, subject) assignment; class teacher alone is not enough", () => {
    expect(teachesSubjectIn(quranTeacher, level2, "quran")).toBe(true);
    expect(teachesSubjectIn(classTeacher, level2, "arabic")).toBe(true);
    expect(teachesSubjectIn(classTeacher, level2, "quran")).toBe(false);
    expect(teachesSubjectIn(quranTeacher, level2, "islamic_studies")).toBe(false);
    expect(teachesSubjectIn(otherTeacher, level2, "quran")).toBe(false);
  });
});

describe("isGuardianOf", () => {
  it("matches on the guardian row", () => {
    expect(isGuardianOf(mother, enrolled)).toBe(true);
    expect(isGuardianOf(teacherParent, enrolled)).toBe(true);
    expect(isGuardianOf(otherParent, enrolled)).toBe(false);
    expect(isGuardianOf(admin, enrolled)).toBe(false);
  });
});

describe("canViewStudent", () => {
  it.each([
    ["admin", admin, true],
    ["class teacher", classTeacher, true],
    ["subject teacher", quranTeacher, true],
    ["unrelated teacher", otherTeacher, false],
    ["former teacher", formerTeacher, false],
    ["their guardian", mother, true],
    ["another guardian", otherParent, false],
    ["the student themself", self, true],
    ["another student", otherStudent, false],
    ["a user with no role", nobody, false],
    ["teacher-parent as parent", teacherParent, true],
  ])("%s → %s", (_label, viewer, expected) => {
    expect(canViewStudent(viewer, enrolled)).toBe(expected);
  });

  it("gives teachers nothing once the enrolment has ended", () => {
    expect(canViewStudent(classTeacher, left)).toBe(false);
    expect(canViewStudent(quranTeacher, left)).toBe(false);
    expect(canViewStudent(mother, left)).toBe(true);
    expect(canViewStudent(admin, left)).toBe(true);
  });
});

describe("canEditRegister", () => {
  it("lets the class's teachers and admin edit any day up to today, never the future", () => {
    expect(canEditRegister(classTeacher, level2, "2026-09-19", "2026-09-19")).toBe(true);
    expect(canEditRegister(quranTeacher, level2, "2026-09-19", "2026-09-19")).toBe(true);
    expect(canEditRegister(classTeacher, level2, "2026-09-12", "2026-09-19")).toBe(true);
    expect(canEditRegister(classTeacher, level2, "2026-09-26", "2026-09-19")).toBe(false);
    expect(canEditRegister(otherTeacher, level2, "2026-09-19", "2026-09-19")).toBe(false);
    expect(canEditRegister(formerTeacher, level2, "2026-09-19", "2026-09-19")).toBe(false);
    expect(canEditRegister(admin, level2, "2026-09-12", "2026-09-19")).toBe(true);
    expect(canEditRegister(admin, level2, "2026-09-26", "2026-09-19")).toBe(false);
  });
});

describe("canViewResource", () => {
  const forAll = {
    audience: "students_and_guardians" as const,
    isSchoolWide: false,
    classId: 100,
    studentId: null,
  };
  const viewer = { classIds: [100], studentIds: [30] };
  const stranger = { classIds: [], studentIds: [] };
  it("checks the audience before the target", () => {
    const staffOnly = { ...forAll, audience: "staff_only" as const };
    expect(canViewResource(mother, staffOnly, viewer)).toBe(false);
    expect(canViewResource(self, staffOnly, viewer)).toBe(false);
    expect(canViewResource(quranTeacher, staffOnly, viewer)).toBe(true);
    const parentsOnly = { ...forAll, audience: "guardians_only" as const };
    expect(canViewResource(self, parentsOnly, viewer)).toBe(false);
    expect(canViewResource(mother, parentsOnly, viewer)).toBe(true);
  });
  it("needs a connection to the class or student unless school-wide or admin", () => {
    expect(canViewResource(mother, forAll, viewer)).toBe(true);
    expect(canViewResource(mother, forAll, stranger)).toBe(false);
    expect(
      canViewResource(otherParent, { ...forAll, isSchoolWide: true, classId: null }, stranger),
    ).toBe(true);
    expect(canViewResource(self, { ...forAll, classId: null, studentId: 30 }, viewer)).toBe(true);
    expect(
      canViewResource(otherStudent, { ...forAll, classId: null, studentId: 30 }, stranger),
    ).toBe(false);
    expect(canViewResource(admin, forAll, stranger)).toBe(true);
    expect(canViewResource(formerTeacher, { ...forAll, audience: "staff_only" }, viewer)).toBe(
      false,
    );
  });
});
