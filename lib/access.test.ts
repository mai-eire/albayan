import { describe, expect, it } from "vitest";
import {
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
    expect(teacherParent.areas).toEqual(["teach", "family"]);
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
