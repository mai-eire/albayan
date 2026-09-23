import { ethnicities as demographicEthnicities, yearGroups } from "@/lib/demographics";
import { getTableColumns, sql, type Table } from "drizzle-orm";
import type { Auth } from "@/lib/auth";
import type { Db } from "@/lib/db";
import * as t from "@/lib/db/schema";

// The demo school. Deterministic (fixed PRNG) so tests can rely on it; re-running resets.
// Every account's password is "password". Rows are built in memory with explicit ids and
// inserted per table in chunks (D1 allows 100 bound parameters per statement).

export const seedPassword = "password";
export const yearId = "2026-27";

const firstNamesM = [
  "Yusuf",
  "Adam",
  "Ibrahim",
  "Omar",
  "Zayd",
  "Hamza",
  "Bilal",
  "Idris",
  "Musa",
  "Ayaan",
  "Rayan",
  "Eesa",
];
const firstNamesF = [
  "Maryam",
  "Aisha",
  "Fatima",
  "Zainab",
  "Hana",
  "Layla",
  "Sara",
  "Noor",
  "Amira",
  "Iman",
  "Safa",
  "Ruqayyah",
];
const lastNames = [
  "Khan",
  "Hussain",
  "Ali",
  "Rahman",
  "Malik",
  "Hassan",
  "Farooq",
  "Siddiqui",
  "Begum",
  "Chowdhury",
  "Mahmood",
  "Rashid",
  "Yusuf",
  "Osman",
  "Abdi",
  "Elmi",
  "Warsame",
  "Haddad",
  "Nasser",
];
const teacherNames = [
  "Maryam Ahmed",
  "Omar Farooq",
  "Khadija Hussain",
  "Bilal Malik",
  "Sumayya Rashid",
  "Yahya Osman",
  "Hafsa Elmi",
  "Ismail Haddad",
];
const languages = ["Arabic", "Urdu", "Somali", "Bengali", "Kurdish"];
const ethnicities = [...demographicEthnicities.slice(0, 6), null];
const areas = ["D15", "D7", "D1", "D3", "D9", "D11", "K78", "A94"];
const streets = ["Main Street", "Castle Road", "Park Avenue", "Mill Lane", "Church View"];
const allergies = [null, null, null, null, "Peanuts", "Penicillin", "Dairy", "Bee stings"];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n: number, width: number) => String(n).padStart(width, "0");

export async function seed(db: Db, auth: Auth) {
  const random = rng(20260905);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
  const hash = await (await auth.$context).password.hash(seedPassword);
  const now = new Date();

  const users: (typeof t.users.$inferInsert)[] = [];
  const accounts: (typeof t.accounts.$inferInsert)[] = [];
  const user = (values: Omit<typeof t.users.$inferInsert, "id" | "createdAt" | "updatedAt">) => {
    const id = users.length + 1;
    users.push({ id, emailVerified: true, createdAt: now, updatedAt: now, ...values });
    accounts.push({
      userId: id,
      providerId: "credential",
      accountId: String(id),
      password: hash,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  };

  const adminUserId = user({ name: "Amina Khan", email: "admin@example.com", isAdmin: true });

  // Eight teachers; teacher 1 (Maryam Ahmed) is also a parent. teachers.id = index + 1.
  const teachers = teacherNames.map((name, i) => ({
    id: i + 1,
    userId: user({
      name,
      email: `teacher${i + 1}@example.com`,
      phone: `08${pad(7000000 + i * 1111, 7)}`,
    }),
  }));

  const sessions = [
    { id: 1, academicYearId: yearId, name: "Saturday", dayOfWeek: 6, startTime: "10:00" },
    { id: 2, academicYearId: yearId, name: "Sunday", dayOfWeek: 0, startTime: "10:00" },
  ];
  const periods = sessions.flatMap((s) => [
    { sessionId: s.id, sortOrder: 1, subjectId: "quran", durationMinutes: 50 },
    { sessionId: s.id, sortOrder: 2, subjectId: "arabic", durationMinutes: 50 },
    { sessionId: s.id, sortOrder: 3, title: "Break", durationMinutes: 20 },
    { sessionId: s.id, sortOrder: 4, subjectId: "islamic_studies", durationMinutes: 50 },
  ]);

  // Four levels per session. Class teacher = teacher (session × 4 + level); Quran by the
  // class teacher, Arabic and Islamic Studies by the next two teachers of that session.
  const classes: (typeof t.classes.$inferInsert & { id: number; level: number })[] = [];
  const assignments: (typeof t.teachingAssignments.$inferInsert)[] = [];
  for (const [s, session] of sessions.entries()) {
    for (let level = 1; level <= 4; level++) {
      const id = s * 4 + level;
      const teacherIn = (offset: number) => teachers[s * 4 + ((level - 1 + offset) % 4)].id;
      classes.push({
        id,
        level,
        academicYearId: yearId,
        sessionId: session.id,
        name: `Level ${level}`,
        classTeacherId: teacherIn(0),
        room: `Room ${level}`,
        capacity: 15,
      });
      assignments.push(
        { classId: id, subjectId: "quran", teacherId: teacherIn(0) },
        { classId: id, subjectId: "arabic", teacherId: teacherIn(1) },
        { classId: id, subjectId: "islamic_studies", teacherId: teacherIn(2) },
      );
    }
  }

  // Forty families: the first twenty have two children, the rest one → sixty students.
  // Family 1 is teacher Maryam's. The last six students are pending applications.
  const guardians: (typeof t.guardians.$inferInsert)[] = [];
  const students: (typeof t.students.$inferInsert)[] = [];
  const studentGuardians: (typeof t.studentGuardians.$inferInsert)[] = [];
  const enrolments: (typeof t.enrolments.$inferInsert)[] = [];
  let studentNumber = 0;
  for (let f = 0; f < 40; f++) {
    const guardianId = f + 1;
    const lastName = f === 0 ? "Ahmed" : pick(lastNames);
    const area = pick(areas);
    const isMother = f === 0 || random() < 0.6;
    guardians.push({
      id: guardianId,
      gender: isMother ? "female" : "male",
      userId:
        f === 0
          ? teachers[0].userId
          : user({
              name: `${pick(isMother ? firstNamesF : firstNamesM)} ${lastName}`,
              email: `parent${f + 1}@example.com`,
              phone: `08${pad(5000000 + f * 2345, 7)}`,
            }),
      addressLine1: `${1 + Math.floor(random() * 120)} ${pick(streets)}`,
      city: "Dublin",
      postalCode: `${area} ${pick(["AB12", "CD34", "EF56"])}`,
      area,
      emergencyContactName: `${pick(firstNamesF)} ${lastName}`,
      emergencyContactPhone: `08${pad(6000000 + f * 3131, 7)}`,
      emergencyContactRelationship: pick(["Aunt", "Uncle", "Grandmother", "Neighbour"]),
      spokenLanguages: [pick(languages), "English"],
      ethnicity: pick(ethnicities),
      registrationReasons: random() < 0.7 ? ["quran", "arabic"] : ["religion", "community"],
    });
    const sessionId = sessions[f % 2].id;
    for (let c = 0; c < (f < 20 ? 2 : 1) && students.length < 60; c++) {
      const id = students.length + 1;
      const pending = id > 54;
      const isFemale = random() < 0.5;
      const firstName = pick(isFemale ? firstNamesF : firstNamesM);
      const birthYear = 2014 + Math.floor(random() * 7);
      const level = Math.min(4, Math.max(1, 2020 - birthYear));
      let studentId: string | null = null;
      let userId: number | null = null;
      if (!pending) {
        studentId = `ALB-26-${pad(++studentNumber, 4)}`;
        userId = user({
          name: `${firstName} ${lastName}`,
          email: `${studentId.toLowerCase()}@students.invalid`,
          username: studentId.toLowerCase(),
          displayUsername: studentId,
        });
      }
      students.push({
        id,
        studentId,
        userId,
        firstName,
        lastName,
        gender: isFemale ? "female" : "male",
        dateOfBirth: `${birthYear}-${pad(1 + Math.floor(random() * 12), 2)}-${pad(1 + Math.floor(random() * 28), 2)}`,
        ethnicity: pick(ethnicities),
        schoolYearGroup:
          yearGroups[Math.min(yearGroups.length - 1, Math.max(1, 2026 - birthYear - 4))],
        arabicProficiency: pick(t.arabicProficiencies),
        allergies: pick(allergies),
        status: pending ? "applied" : "active",
        applicationYearId: yearId,
        preferredSessionId: sessionId,
        applicationNotes: pending ? "Would prefer to be with their cousin if possible." : null,
        appliedAt: pending ? "2026-09-10T10:00:00.000Z" : "2026-08-20T10:00:00.000Z",
        approvedAt: pending ? null : "2026-08-25T10:00:00.000Z",
        createdByGuardianId: guardianId,
      });
      studentGuardians.push({
        studentId: id,
        guardianId,
        relationship: isMother ? "mother" : "father",
        isPrimaryContact: true,
      });
      if (!pending) {
        const cls = classes.find((k) => k.sessionId === sessionId && k.level === level)!;
        enrolments.push({
          studentId: id,
          classId: cls.id,
          startDate: "2026-09-05",
          feeCents: c === 0 ? 25000 : 20000,
          feeNote: c === 0 ? null : "Sibling discount",
        });
      }
    }
  }

  await reset(db);
  await bulk(db, t.schoolSettings, [
    {
      id: 1,
      name: "Al-Bayan Weekend School",
      timezone: "Europe/Dublin",
      studentIdPrefix: "ALB",
      bankAccountName: "Al-Bayan Weekend School",
      bankIban: "IE29AIBK93115212345678",
      bankBic: "AIBKIE2D",
    },
  ]);
  await bulk(db, t.users, users);
  await bulk(db, t.accounts, accounts);
  await bulk(db, t.subjects, [
    { id: "quran", name: "Quran" },
    { id: "arabic", name: "Arabic" },
    { id: "islamic_studies", name: "Islamic Studies" },
  ]);
  await bulk(db, t.academicYears, [
    {
      id: yearId,
      startDate: "2026-09-05",
      endDate: "2027-06-27",
      isCurrent: true,
      standardFeeCents: 25000,
    },
  ]);
  await bulk(db, t.terms, [
    { academicYearId: yearId, name: "Autumn term", startDate: "2026-09-05", endDate: "2026-12-20" },
    { academicYearId: yearId, name: "Spring term", startDate: "2027-01-09", endDate: "2027-03-28" },
    { academicYearId: yearId, name: "Summer term", startDate: "2027-04-17", endDate: "2027-06-27" },
  ]);
  await bulk(db, t.schoolSessions, sessions);
  await bulk(db, t.sessionPeriods, periods);
  await bulk(db, t.teachers, teachers);
  await bulk(
    db,
    t.classes,
    classes.map(({ level, ...cls }) => (void level, cls)),
  );
  await bulk(db, t.teachingAssignments, assignments);
  await bulk(db, t.guardians, guardians);
  await bulk(db, t.students, students);
  await bulk(db, t.studentGuardians, studentGuardians);
  await bulk(db, t.enrolments, enrolments);
  // Most families have paid in full, some half, a few nothing yet — so the fees page and
  // the dashboard tile have something to show.
  const placed = await db
    .select({
      id: t.enrolments.id,
      studentId: t.enrolments.studentId,
      feeCents: t.enrolments.feeCents,
    })
    .from(t.enrolments);
  const payments: (typeof t.payments.$inferInsert)[] = [];
  for (const e of placed) {
    const link = studentGuardians.find((sg) => sg.studentId === e.studentId)!;
    const roll = random();
    if (roll < 0.15 || e.feeCents === 0) continue;
    const full = roll < 0.75;
    payments.push({
      enrolmentId: e.id,
      amountCents: full ? e.feeCents : e.feeCents / 2,
      paidOn: `2026-09-${pad(5 + Math.floor(random() * 10), 2)}`,
      method: pick(["cash", "bank_transfer", "bank_transfer", "card"] as const),
      reference: random() < 0.5 ? `ALB ${pad(Math.floor(random() * 9000) + 1000, 4)}` : null,
      paidByGuardianId: link.guardianId,
      recordedByUserId: adminUserId,
    });
  }
  await bulk(db, t.payments, payments);
  await bulk(db, t.auditLog, [
    {
      actorUserId: adminUserId,
      action: "seed",
      entityType: "database",
      entityId: "local",
      changes: { students: students.length },
    },
  ]);
}

// Inserts in chunks that stay under D1's 100 parameters per statement.
async function bulk<T extends Table>(db: Db, table: T, rows: T["$inferInsert"][]) {
  if (!rows.length) return;
  const columns = Object.keys(getTableColumns(table)).length;
  const size = Math.max(1, Math.floor(90 / columns));
  for (let i = 0; i < rows.length; i += size) {
    await db.insert(table).values(rows.slice(i, i + size));
  }
}

async function reset(db: Db) {
  // Child tables first so foreign keys never block the delete.
  const order = [
    t.auditLog,
    t.notifications,
    t.eventParticipants,
    t.eventTargets,
    t.events,
    t.payments,
    t.resources,
    t.studentNotes,
    t.homework,
    t.attendance,
    t.enrolments,
    t.studentGuardians,
    t.students,
    t.teachingAssignments,
    t.classes,
    t.sessionPeriods,
    t.schoolSessions,
    t.terms,
    t.academicYears,
    t.subjects,
    t.guardians,
    t.teachers,
    t.verifications,
    t.sessions,
    t.accounts,
    t.users,
    t.schoolSettings,
  ];
  for (const table of order) await db.delete(table);
  await db.run(sql`delete from sqlite_sequence`);
}
