import { commonAllergies, yearGroups } from "@/lib/demographics";
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
// A spread of countries families here come from, plus "didn't say".
const origins = [
  "Ireland",
  "Egypt",
  "Pakistan",
  "Somalia",
  "Syria",
  "Nigeria",
  "Bangladesh",
  "Algeria",
  "Morocco",
  "Mixed",
  null,
] as const;
const areas = ["D15", "D7", "D1", "D3", "D9", "D11", "K78", "A94"];
const streets = ["Main Street", "Castle Road", "Park Avenue", "Mill Lane", "Church View"];
const allergies = [null, null, null, null, ...commonAllergies.slice(0, 6)];

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
      countryOfOrigin: pick(origins),
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
        countryOfOrigin: pick(origins),
        schoolYearGroup:
          yearGroups[Math.min(yearGroups.length - 1, Math.max(1, 2026 - birthYear - 4))],
        arabicProficiency: pick(t.arabicProficiencies),
        allergies: pick(allergies),
        // From the id, not random(): a draw here would reshuffle every child after it.
        isHomeschooled: id % 17 === 0,
        status: pending ? "applied" : "active",
        applicationYearId: yearId,
        preferredSessionId: pending && id % 3 === 0 ? null : sessionId,
        // Some applicants name a level, some leave it to the office.
        preferredClassName: pending && id % 2 === 0 ? `Level ${level}` : null,
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

  // Six families have a second parent on the record, so co-guardians, "Mother of Amira and
  // Yusuf" and an invite that hasn't been taken up yet all have something to show.
  for (let f = 0; f < 6; f++) {
    const guardianId = 41 + f;
    const first = guardians[f];
    const theirKids = studentGuardians.filter((sg) => sg.guardianId === f + 1);
    const lastName = students.find((st) => st.id === theirKids[0]?.studentId)?.lastName;
    if (!theirKids.length || !lastName) continue;
    const isMother = first.gender !== "female";
    guardians.push({
      id: guardianId,
      gender: isMother ? "female" : "male",
      userId: user({
        name: `${pick(isMother ? firstNamesF : firstNamesM)} ${lastName}`,
        email: `parent${41 + f}@example.com`,
        phone: `08${pad(5500000 + f * 4321, 7)}`,
        // The last two haven't set a password yet: their row reads "Invited".
        status: f >= 4 ? "invited" : "active",
      }),
      addressLine1: first.addressLine1,
      city: first.city,
      postalCode: first.postalCode,
      area: first.area,
      emergencyContactName: first.emergencyContactName,
      emergencyContactPhone: first.emergencyContactPhone,
      emergencyContactRelationship: first.emergencyContactRelationship,
      spokenLanguages: first.spokenLanguages,
      countryOfOrigin: first.countryOfOrigin,
      registrationReasons: first.registrationReasons,
    });
    for (const link of theirKids) {
      studentGuardians.push({
        studentId: link.studentId,
        guardianId,
        relationship: isMother ? "mother" : "father",
        isPrimaryContact: false,
      });
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

  // Registers for every session day of the term so far bar the most recent, which is left
  // for the "registers not taken" warnings. Attendance is what a family's "3 / 6" counts.
  const lessonDates = (dayOfWeek: number) => {
    const dates: string[] = [];
    for (const d = new Date("2026-09-05T12:00:00Z"); d <= now; d.setUTCDate(d.getUTCDate() + 1)) {
      if (d.getUTCDay() === dayOfWeek) dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  };
  // Every lesson day so far bar the most recent, which is the register still to be taken.
  const sessionDates = (dayOfWeek: number) => lessonDates(dayOfWeek).slice(0, -1);
  const attendance: (typeof t.attendance.$inferInsert)[] = [];
  for (const e of enrolments) {
    const cls = classes.find((k) => k.id === e.classId)!;
    const session = sessions.find((x) => x.id === cls.sessionId)!;
    for (const date of sessionDates(session.dayOfWeek)) {
      const roll = random();
      attendance.push({
        studentId: e.studentId,
        classId: e.classId,
        date,
        status: roll < 0.82 ? "present" : roll < 0.9 ? "late" : roll < 0.96 ? "absent" : "excused",
        note: roll >= 0.9 && roll < 0.96 ? "No message from home" : null,
        recordedByUserId: teachers[0].userId,
      });
    }
  }
  await bulk(db, t.attendance, attendance);

  // Two published pieces of homework per class: one already due, one due this coming lesson.
  const homeworkTitles: Record<string, string[]> = {
    quran: ["Memorise Surah Al-Asr", "Revise last week's ayat"],
    arabic: ["Write the alphabet ا to ع", "Ten new words with their meanings"],
    islamic_studies: ["Draw the five pillars", "Read about the Prophet's birth"],
  };
  const homework: (typeof t.homework.$inferInsert)[] = [];
  for (const cls of classes) {
    const session = sessions.find((x) => x.id === cls.sessionId)!;
    const days = lessonDates(session.dayOfWeek);
    const subjectId = pick(["quran", "arabic", "islamic_studies"] as const);
    const teacher = assignments.find((a) => a.classId === cls.id && a.subjectId === subjectId)!;
    const teacherUserId = teachers.find((x) => x.id === teacher.teacherId)!.userId;
    for (const [i, due] of [days.at(-2), days.at(-1)].entries()) {
      if (!due) continue;
      homework.push({
        classId: cls.id,
        subjectId,
        title: homeworkTitles[subjectId][i],
        description: "Bring it to the next lesson.",
        dueDate: due,
        publishedAt: `${due}T09:00:00.000Z`,
        createdByUserId: teacherUserId,
      });
    }
  }
  await bulk(db, t.homework, homework);

  // What the families were told about it, so the bell and the notifications page have rows.
  const subjectNames: Record<string, string> = {
    quran: "Quran",
    arabic: "Arabic",
    islamic_studies: "Islamic Studies",
  };
  const notifications: (typeof t.notifications.$inferInsert)[] = [];
  const guardianUserOf = (studentId: number) => {
    const link = studentGuardians.find((sg) => sg.studentId === studentId && sg.isPrimaryContact);
    return link ? guardians.find((g) => g.id === link.guardianId)?.userId : undefined;
  };
  for (const hw of homework) {
    const cls = classes.find((k) => k.id === hw.classId)!;
    for (const e of enrolments.filter((x) => x.classId === cls.id).slice(0, 3)) {
      const userId = guardianUserOf(e.studentId);
      if (!userId) continue;
      notifications.push({
        userId,
        type: "homework.published",
        title: `New homework: ${hw.title}`,
        body: `${subjectNames[hw.subjectId]} for ${cls.name}: ${hw.title}.`,
        href: `/family/${e.studentId}/homework`,
        subjectId: hw.subjectId,
        studentId: e.studentId,
        readAt: random() < 0.4 ? `${hw.dueDate}T18:00:00.000Z` : null,
        createdAt: `${hw.publishedAt}`,
      });
    }
  }
  for (const a of attendance.filter((x) => x.status === "absent").slice(0, 12)) {
    const userId = guardianUserOf(a.studentId);
    const name = students.find((x) => x.id === a.studentId)?.firstName;
    if (!userId || !name) continue;
    notifications.push({
      userId,
      type: "attendance.absent",
      title: `${name} was marked absent`,
      body: `${classes.find((k) => k.id === a.classId)?.name} on ${a.date}.`,
      href: `/family/${a.studentId}`,
      studentId: a.studentId,
      createdAt: `${a.date}T12:00:00.000Z`,
    });
  }
  await bulk(db, t.notifications, notifications);

  // The school's own calendar: the dates it announces and a few things families may join,
  // including one draft, so the office can see what a draft looks like and nobody else can.
  // Fixed dates, never random(): a draw here would reshuffle every child after it.
  const calendar: (Omit<typeof t.events.$inferInsert, "createdByUserId"> & {
    targets?: number[];
  })[] = [
    { title: "Mid-term break", type: "holiday", startAt: "2026-10-24", endAt: "2026-11-01" },
    {
      title: "Closed for maintenance",
      type: "closure",
      startAt: "2026-10-10",
      endAt: "2026-10-10",
      audience: "selected_sessions",
      targets: [1],
    },
    {
      title: "Level 4 trip to the mosque",
      type: "trip",
      startAt: "2026-10-17T10:00",
      endAt: "2026-10-17T13:00",
      location: "Dublin Mosque",
      feeCents: 1000,
      audience: "selected_classes",
      targets: [4],
    },
    {
      title: "Parent–teacher meetings",
      type: "parent_teacher_meeting",
      startAt: "2026-11-21T10:00",
      endAt: "2026-11-21T14:00",
      location: "The school hall",
      description: "Ten minutes with each class teacher. Times go out the week before.",
    },
    {
      title: "Family bazaar",
      type: "community",
      startAt: "2026-11-28T11:00",
      endAt: "2026-11-28T15:00",
      location: "The school hall",
    },
    { title: "Quran assessments", type: "exam", startAt: "2026-12-12", endAt: "2026-12-13" },
    {
      title: "Staff meeting",
      type: "staff_meeting",
      startAt: "2026-10-03T09:00",
      endAt: "2026-10-03T09:45",
      location: "The staff room",
      audience: "staff",
      description: "Registers, the term's homework plan, and the trip rota.",
    },
    {
      title: "Staff training day",
      type: "staff_meeting",
      startAt: "2026-11-07",
      endAt: "2026-11-07",
      audience: "staff",
    },
    { title: "Winter break", type: "holiday", startAt: "2026-12-21", endAt: "2027-01-08" },
    {
      title: "Sports day",
      type: "sports_day",
      startAt: "2027-05-15T10:00",
      endAt: "2027-05-15T14:00",
      location: "Bushy Park",
    },
    {
      title: "Summer school",
      type: "summer_school",
      startAt: "2027-06-21",
      endAt: "2027-06-25",
      feeCents: 5000,
      isPublished: false,
    },
  ];
  await bulk(
    db,
    t.events,
    calendar.map(({ targets: _targets, ...event }, i) => ({
      id: i + 1,
      isPublished: true,
      createdByUserId: 1,
      ...event,
    })),
  );
  await bulk(
    db,
    t.eventTargets,
    calendar.flatMap((event, i) =>
      (event.targets ?? []).map((target) => ({
        eventId: i + 1,
        sessionId: event.audience === "selected_sessions" ? target : null,
        classId: event.audience === "selected_classes" ? target : null,
      })),
    ),
  );
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
