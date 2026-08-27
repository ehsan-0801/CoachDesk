/**
 * Fills the database with a coherent demo centre: three months of classes,
 * attendance, fees and exam results across five batches.
 *
 *   npx prisma db seed          (after `npx prisma migrate deploy`)
 *   npm run db:reset            (drop everything, re-migrate, re-seed)
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { PrismaClient } from "@prisma/client";
import { ROLE_DEFAULT_PERMISSIONS } from "../src/lib/rbac/modules";
import { permissionMapToRows } from "../src/lib/rbac/permissions";
import { DEFAULT_SMS_TEMPLATES } from "../src/server/sms/templates";

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 1 }) });

/* ── deterministic pseudo-randomness, so reseeding gives the same demo ────── */
let seedState = 20260828;
function rand() {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}
const pick = <T,>(items: readonly T[]): T => items[Math.floor(rand() * items.length)];
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

/** Dates are `@db.Date` columns; building them at UTC midnight keeps the stored
 *  day identical no matter which timezone the seed runs in. */
const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const addDays = (base: Date, n: number) =>
  new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + n));
const ymd = (d: Date) => d.toISOString().slice(0, 10);

const NOW = new Date();
const TODAY = day(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
const CURRENT_YEAR = NOW.getFullYear();

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

const FIRST_NAMES = [
  "Rafiul", "Tanvir", "Sadia", "Nusrat", "Arafat", "Mehedi", "Jarin", "Sabbir", "Fahim", "Ishrat",
  "Nafis", "Anika", "Rakib", "Tasnim", "Shakib", "Farhana", "Imran", "Sumaiya", "Rifat", "Maliha",
  "Zubair", "Nabila", "Tahmid", "Raisa", "Sabikun", "Adib", "Prottoy", "Mim", "Sadman", "Lamia",
];
const LAST_NAMES = [
  "Hasan", "Islam", "Rahman", "Ahmed", "Chowdhury", "Karim", "Hossain", "Akter", "Sultana", "Mahmud",
];

const makeName = () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
const makePhone = () => `01${pick(["3", "5", "6", "7", "8", "9"])}${between(10000000, 99999999)}`;

/** Wipes every table in dependency order, so the seed is safely re-runnable. */
async function clear() {
  await db.smsMessage.deleteMany();
  await db.smsTemplate.deleteMany();
  await db.appSetting.deleteMany();
  await db.announcement.deleteMany();
  await db.examResult.deleteMany();
  await db.examBatch.deleteMany();
  await db.exam.deleteMany();
  await db.noteDistribution.deleteMany();
  await db.expense.deleteMany();
  await db.expenseType.deleteMany();
  await db.note.deleteMany();
  await db.payment.deleteMany();
  await db.feeType.deleteMany();
  await db.attendance.deleteMany();
  await db.classHeld.deleteMany();
  await db.student.deleteMany();
  await db.batch.deleteMany();
  await db.college.deleteMany();
  await db.session.deleteMany();
  await db.userPermission.deleteMany();
  await db.user.deleteMany();
}

async function main() {
  console.log("Seeding CoachDesk…\n");
  await clear();

  /* ── Users & permissions ─────────────────────────────────────────────── */
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const admin = await db.user.create({
    data: { name: "System Admin", email: "admin@coachdesk.test", passwordHash, role: "admin", phone: makePhone() },
  });
  const manager = await db.user.create({
    data: { name: "Nazmul Karim", email: "manager@coachdesk.test", passwordHash, role: "manager", phone: makePhone() },
  });
  const staff = await db.user.create({
    data: { name: "Rumana Parvin", email: "staff@coachdesk.test", passwordHash, role: "staff", phone: makePhone() },
  });

  for (const user of [admin, manager, staff]) {
    await db.userPermission.createMany({
      data: permissionMapToRows(user.id, ROLE_DEFAULT_PERMISSIONS[user.role]),
    });
  }
  console.log("  users                             3");

  /* ── Reference data ──────────────────────────────────────────────────── */
  await db.college.createMany({
    data: [
      { name: "Notre Dame College", shortName: "NDC" },
      { name: "Dhaka College", shortName: "DC" },
      { name: "Holy Cross College", shortName: "HCC" },
      { name: "Rajuk Uttara Model College", shortName: "RUMC" },
      { name: "Govt. Science College", shortName: "GSC" },
      { name: "Adamjee Cantonment College", shortName: "ACC" },
      { name: "Viqarunnisa Noon School & College", shortName: "VNSC" },
    ],
  });
  const colleges = await db.college.findMany();

  await db.feeType.createMany({
    data: [
      { name: "মাসিক ফি", amount: "1200", isModelTest: false },
      { name: "ভর্তি ফি", amount: "1000", isModelTest: false },
      { name: "মডেল টেস্ট ফি", amount: "500", isModelTest: true },
      { name: "নোট ফি", amount: "200", isModelTest: false },
    ],
  });
  const feeTypes = await db.feeType.findMany();
  const monthlyFeeType = feeTypes.find((f) => f.name === "মাসিক ফি")!;
  const admissionFeeType = feeTypes.find((f) => f.name === "ভর্তি ফি")!;
  const modelTestFeeType = feeTypes.find((f) => f.isModelTest)!;

  await db.expenseType.createMany({
    data: [
      { name: "নোট প্রিন্ট" }, { name: "অন্যান্য প্রিন্ট" }, { name: "বাড়ি ভাড়া" },
      { name: "বিদ্যুৎ বিল" }, { name: "শিক্ষক সম্মানী" }, { name: "গিফট ক্রয়" }, { name: "আপ্যায়ন" },
    ],
  });
  const expenseTypes = await db.expenseType.findMany();
  const expenseTypeByName = new Map(expenseTypes.map((t) => [t.name, t]));
  console.log(`  colleges / fees / expense types   ${colleges.length} / ${feeTypes.length} / ${expenseTypes.length}`);

  /* ── Batches ─────────────────────────────────────────────────────────── */
  const batchSeeds = [
    {
      batchNumber: 1, name: `HSC ${CURRENT_YEAR} — Morning`, hscYear: String(CURRENT_YEAR),
      daysInWeek: ["saturday", "monday", "wednesday"], startTime: "08:00", endTime: "09:30",
      monthsAgo: 5, tuitionFee: 1200, admissionFee: 1000,
      infoLine1: "ICT — Full Course", infoLine2: "Sat / Mon / Wed · 8:00 – 9:30 AM",
      hscYearColor: "#f5b700", infoLine1Color: "#1c1917", infoLine2Color: "#6b6257",
    },
    {
      batchNumber: 2, name: `HSC ${CURRENT_YEAR} — Evening`, hscYear: String(CURRENT_YEAR),
      daysInWeek: ["sunday", "tuesday", "thursday"], startTime: "17:00", endTime: "18:30",
      monthsAgo: 4, tuitionFee: 1200, admissionFee: 1000,
      infoLine1: "ICT — Full Course", infoLine2: "Sun / Tue / Thu · 5:00 – 6:30 PM",
      hscYearColor: "#f5b700", infoLine1Color: "#1c1917", infoLine2Color: "#6b6257",
    },
    {
      batchNumber: 3, name: `HSC ${CURRENT_YEAR + 1} — Morning`, hscYear: String(CURRENT_YEAR + 1),
      daysInWeek: ["saturday", "monday", "wednesday"], startTime: "10:00", endTime: "11:30",
      monthsAgo: 3, tuitionFee: 1300, admissionFee: 1000,
      infoLine1: "ICT — Foundation", infoLine2: "Sat / Mon / Wed · 10:00 – 11:30 AM",
      hscYearColor: "#7cc6fe", infoLine1Color: "#1c1917", infoLine2Color: "#6b6257",
    },
    {
      batchNumber: 4, name: `HSC ${CURRENT_YEAR + 1} — Model Test`, hscYear: String(CURRENT_YEAR + 1),
      daysInWeek: ["friday"], startTime: "09:00", endTime: "12:00",
      monthsAgo: 2, tuitionFee: 0, admissionFee: 0,
      infoLine1: "Weekly Model Test", infoLine2: "Friday · 9:00 AM – 12:00 PM",
      hscYearColor: "#ff7a5c", infoLine1Color: "#1c1917", infoLine2Color: "#6b6257",
    },
    {
      batchNumber: 5, name: `HSC ${CURRENT_YEAR - 1} — Completed`, hscYear: String(CURRENT_YEAR - 1),
      daysInWeek: ["sunday", "wednesday"], startTime: "16:00", endTime: "17:30",
      monthsAgo: 16, tuitionFee: 1100, admissionFee: 800, archived: true,
      infoLine1: null, infoLine2: null,
      hscYearColor: null, infoLine1Color: null, infoLine2Color: null,
    },
  ];

  for (const seed of batchSeeds) {
    await db.batch.create({
      data: {
        batchNumber: seed.batchNumber,
        name: seed.name,
        hscYear: seed.hscYear,
        daysInWeek: seed.daysInWeek,
        startTime: seed.startTime,
        endTime: seed.endTime,
        startingDate: day(CURRENT_YEAR, NOW.getMonth() - seed.monthsAgo, 1),
        duration: "12 months",
        tuitionFee: seed.tuitionFee,
        admissionFee: seed.admissionFee,
        archived: seed.archived ?? false,
        infoLine1: seed.infoLine1,
        infoLine2: seed.infoLine2,
        hscYearColor: seed.hscYearColor,
        infoLine1Color: seed.infoLine1Color,
        infoLine2Color: seed.infoLine2Color,
      },
    });
  }
  const batches = await db.batch.findMany({ orderBy: { batchNumber: "asc" } });
  console.log(`  batches                           ${batches.length}`);

  /* ── Students ────────────────────────────────────────────────────────── */
  const STUDENTS_PER_BATCH = [22, 18, 16, 12, 14];
  const uidCounters = new Map<string, number>();

  for (const [batchIndex, batch] of batches.entries()) {
    const isModelTestBatch = batch.name?.includes("Model Test") ?? false;
    const yearPrefix = batch.hscYear.slice(-2);
    const rows = [];

    for (let i = 0; i < STUDENTS_PER_BATCH[batchIndex]; i += 1) {
      const nextSerial = (uidCounters.get(yearPrefix) ?? 0) + 1;
      uidCounters.set(yearPrefix, nextSerial);

      const candidate = addDays(batch.startingDate, between(0, 45));
      const admissionDate = candidate > TODAY ? batch.startingDate : candidate;
      // A handful carry no guardian number, so the "missing guardian number"
      // screen has real rows to work with.
      const hasParentPhone = rand() > 0.12;

      rows.push({
        studentUid: `${yearPrefix}${String(nextSerial).padStart(3, "0")}`,
        name: makeName(),
        phone: makePhone(),
        parentName: `${pick(LAST_NAMES)} ${pick(["Mia", "Sarkar", "Bhuiyan", "Talukder"])}`,
        parentPhone: hasParentPhone ? makePhone() : null,
        collegeId: pick(colleges).id,
        collegeRoll: String(between(100, 9999)),
        hscYear: batch.hscYear,
        gender: (rand() > 0.45 ? "male" : "female") as "male" | "female",
        division: pick(["Science", "Business Studies", "Humanities"]),
        courseType: isModelTestBatch ? "Model Test" : pick(["Full Course", "Crash Course", "Revision"]),
        admissionDate,
        admissionFee: String(batch.admissionFee),
        monthlyFee: String(isModelTestBatch ? 0 : batch.tuitionFee),
        modelTestFee: isModelTestBatch ? "500" : null,
        batchId: batch.id,
        archived: batch.archived,
        isModelTest: isModelTestBatch,
        isNameVerified: rand() > 0.4,
        comment: rand() > 0.9 ? "Needs extra support in the programming chapters." : null,
        createdById: rand() > 0.5 ? admin.id : manager.id,
      });
    }
    await db.student.createMany({ data: rows });
  }

  const students = await db.student.findMany({ orderBy: { id: "asc" } });
  console.log(`  students                          ${students.length}`);

  const studentsByBatch = new Map<number, typeof students>();
  for (const student of students) {
    if (!student.batchId) continue;
    const list = studentsByBatch.get(student.batchId) ?? [];
    list.push(student);
    studentsByBatch.set(student.batchId, list);
  }

  /* ── Classes held + attendance (last 10 weeks) ───────────────────────── */
  const classRows: { batchId: number; classDate: Date; recordedById: number }[] = [];
  const attendanceRows: {
    studentId: number; batchId: number; attendanceDate: Date;
    status: "present" | "absent"; source: "regular"; recordedById: number;
  }[] = [];

  const windowStart = addDays(TODAY, -70);

  for (const batch of batches) {
    if (batch.archived) continue;
    const roster = studentsByBatch.get(batch.id) ?? [];
    if (!roster.length) continue;

    const weekdays = batch.daysInWeek.map((d) => WEEKDAY_INDEX[d]).filter((n) => n !== undefined);

    for (let cursor = windowStart; cursor <= TODAY; cursor = addDays(cursor, 1)) {
      if (!weekdays.includes(cursor.getUTCDay())) continue;
      if (cursor < batch.startingDate) continue;

      classRows.push({ batchId: batch.id, classDate: cursor, recordedById: manager.id });

      for (const student of roster) {
        // A student cannot be marked for a class held before they enrolled.
        if (student.admissionDate > cursor) continue;
        attendanceRows.push({
          studentId: student.id,
          batchId: batch.id,
          attendanceDate: cursor,
          status: rand() > 0.18 ? "present" : "absent",
          source: "regular",
          recordedById: manager.id,
        });
      }
    }
  }

  await db.classHeld.createMany({ data: classRows });
  for (let i = 0; i < attendanceRows.length; i += 1000) {
    await db.attendance.createMany({ data: attendanceRows.slice(i, i + 1000) });
  }
  console.log(`  classes held / attendance rows    ${classRows.length} / ${attendanceRows.length}`);

  /* ── Payments ────────────────────────────────────────────────────────── */
  const paymentRows: {
    studentId: number; batchId: number; feeTypeId: number; paymentType: string;
    amount: string; paymentDate: Date; paymentMonth: number; paymentYear: number;
    method: "cash" | "bkash" | "nagad" | "rocket"; isModelTest?: boolean; recordedById: number;
  }[] = [];

  for (const student of students) {
    if (!student.batchId) continue;
    const admission = student.admissionDate;

    if (student.isModelTest) {
      // A single fee; roughly a fifth still owe it.
      if (rand() > 0.2) {
        paymentRows.push({
          studentId: student.id,
          batchId: student.batchId,
          feeTypeId: modelTestFeeType.id,
          paymentType: modelTestFeeType.name,
          amount: String(student.modelTestFee ?? 500),
          paymentDate: addDays(admission, between(0, 7)),
          paymentMonth: admission.getUTCMonth() + 1,
          paymentYear: admission.getUTCFullYear(),
          method: pick(["cash", "bkash", "nagad"] as const),
          isModelTest: true,
          recordedById: manager.id,
        });
      }
      continue;
    }

    if (Number(student.admissionFee) > 0) {
      paymentRows.push({
        studentId: student.id,
        batchId: student.batchId,
        feeTypeId: admissionFeeType.id,
        paymentType: admissionFeeType.name,
        amount: String(student.admissionFee),
        paymentDate: admission,
        paymentMonth: admission.getUTCMonth() + 1,
        paymentYear: admission.getUTCFullYear(),
        method: "cash",
        recordedById: manager.id,
      });
    }

    // Monthly fees from admission to now, with a realistic scatter of gaps and
    // part-payments so the dues report has something to show.
    const monthly = Number(student.monthlyFee);
    if (monthly <= 0) continue;

    let year = admission.getUTCFullYear();
    let month = admission.getUTCMonth();
    while (year < CURRENT_YEAR || (year === CURRENT_YEAR && month <= NOW.getMonth())) {
      const roll = rand();
      if (roll > 0.14) {
        const amount = roll > 0.94 ? Math.round(monthly / 2) : monthly;
        const candidate = day(year, month, between(1, 20));
        paymentRows.push({
          studentId: student.id,
          batchId: student.batchId,
          feeTypeId: monthlyFeeType.id,
          paymentType: monthlyFeeType.name,
          amount: String(amount),
          paymentDate: candidate > TODAY ? TODAY : candidate,
          paymentMonth: month + 1,
          paymentYear: year,
          method: pick(["cash", "cash", "bkash", "nagad", "rocket"] as const),
          recordedById: rand() > 0.5 ? manager.id : staff.id,
        });
      }
      month += 1;
      if (month > 11) { month = 0; year += 1; }
    }
  }

  for (let i = 0; i < paymentRows.length; i += 1000) {
    await db.payment.createMany({ data: paymentRows.slice(i, i + 1000) });
  }
  console.log(`  payments                          ${paymentRows.length}`);

  /* ── Exams, assignments and results ──────────────────────────────────── */
  await db.exam.createMany({
    data: [
      { examName: "Weekly Test 01", subjectName: "ICT", paperNumber: "1st", chapter: "Chapter 1 — ICT in the World", examType: "Weekly", mcqMarks: 25, cqMarks: 25 },
      { examName: "Weekly Test 02", subjectName: "ICT", paperNumber: "1st", chapter: "Chapter 2 — Communication Systems", examType: "Weekly", mcqMarks: 25, cqMarks: 25 },
      { examName: "Monthly Test — August", subjectName: "ICT", paperNumber: "1st", chapter: "Chapters 1–3", examType: "Monthly", mcqMarks: 30, cqMarks: 40 },
      { examName: "Chapter Test — Number Systems", subjectName: "ICT", paperNumber: "1st", chapter: "Chapter 3 — Number Systems", examType: "Chapter", mcqMarks: 20, cqMarks: 30 },
      { examName: "Model Test 01", subjectName: "ICT", paperNumber: "Full", chapter: "Full syllabus", examType: "Model", mcqMarks: 25, cqMarks: 50 },
    ],
  });
  const exams = await db.exam.findMany({ orderBy: { id: "asc" } });
  const activeBatches = batches.filter((b) => !b.archived);

  const examBatchRows: {
    examId: number; batchId: number; examDate: Date;
    startTime: string; endTime: string; status: "completed";
  }[] = [];

  exams.forEach((exam, examIndex) => {
    for (const batch of activeBatches) {
      const isModelTestBatch = batch.name?.includes("Model Test") ?? false;
      // The full model test only goes to the model-test batch, and vice versa.
      if ((exam.examType === "Model") !== isModelTestBatch) continue;
      examBatchRows.push({
        examId: exam.id,
        batchId: batch.id,
        examDate: addDays(TODAY, -(55 - examIndex * 12)),
        startTime: batch.startTime,
        endTime: batch.endTime,
        status: "completed",
      });
    }
  });
  await db.examBatch.createMany({ data: examBatchRows });
  const examBatches = await db.examBatch.findMany();

  const resultRows: {
    examId: number; studentId: number; batchId: number;
    mcqMarks: number; cqMarks: number; totalMarks: number;
    status: "published"; recordedById: number;
  }[] = [];

  for (const assignment of examBatches) {
    const exam = exams.find((e) => e.id === assignment.examId)!;
    for (const student of studentsByBatch.get(assignment.batchId) ?? []) {
      if (student.admissionDate > assignment.examDate) continue;
      // ~12% sit out each exam and are left without a result row.
      if (rand() < 0.12) continue;

      const mcq = between(Math.floor(exam.mcqMarks * 0.35), exam.mcqMarks);
      const cq = between(Math.floor(exam.cqMarks * 0.35), exam.cqMarks);
      resultRows.push({
        examId: exam.id,
        studentId: student.id,
        batchId: assignment.batchId,
        mcqMarks: mcq,
        cqMarks: cq,
        totalMarks: mcq + cq,
        status: "published",
        recordedById: manager.id,
      });
    }
  }
  for (let i = 0; i < resultRows.length; i += 1000) {
    await db.examResult.createMany({ data: resultRows.slice(i, i + 1000) });
  }
  console.log(`  exams / assignments / results     ${exams.length} / ${examBatches.length} / ${resultRows.length}`);

  /* ── Notes, distribution and expenses ────────────────────────────────── */
  await db.note.createMany({
    data: [
      { name: "ICT Chapter 1 — Handout", quantity: 120, createdById: admin.id },
      { name: "ICT Chapter 2 — Handout", quantity: 95, createdById: admin.id },
      { name: "Number Systems Worksheet", quantity: 60, createdById: admin.id },
      { name: "HTML & Programming Sheet", quantity: 80, createdById: admin.id },
      { name: "Final Revision Booklet", quantity: 40, createdById: admin.id },
    ],
  });
  const notes = await db.note.findMany({ orderBy: { id: "asc" } });

  const distributionRows: { noteId: number; studentId: number; distributedAt: Date; distributedById: number }[] = [];
  for (const note of notes.slice(0, 3)) {
    for (const student of students.filter((s) => !s.archived)) {
      if (rand() > 0.55) continue;
      distributionRows.push({
        noteId: note.id,
        studentId: student.id,
        distributedAt: addDays(TODAY, -between(1, 50)),
        distributedById: manager.id,
      });
    }
  }
  if (distributionRows.length) await db.noteDistribution.createMany({ data: distributionRows });

  const expenseRows = [];
  for (let monthsBack = 4; monthsBack >= 0; monthsBack -= 1) {
    const m = NOW.getMonth() - monthsBack;
    expenseRows.push(
      { expenseTypeId: expenseTypeByName.get("বাড়ি ভাড়া")!.id, amount: "18000", expenseDate: day(CURRENT_YEAR, m, 3), description: "Monthly rent", recordedById: admin.id },
      { expenseTypeId: expenseTypeByName.get("বিদ্যুৎ বিল")!.id, amount: String(between(2400, 4200)), expenseDate: day(CURRENT_YEAR, m, 8), description: "Electricity bill", recordedById: admin.id },
      { expenseTypeId: expenseTypeByName.get("শিক্ষক সম্মানী")!.id, amount: String(between(22000, 30000)), expenseDate: day(CURRENT_YEAR, m, 5), description: "Teacher honorarium", recordedById: admin.id },
      {
        expenseTypeId: expenseTypeByName.get("নোট প্রিন্ট")!.id, amount: String(between(3000, 7000)),
        quantity: between(60, 150), noteId: pick(notes).id, noteType: "Handout", printType: "Offset",
        expenseDate: day(CURRENT_YEAR, m, 12), description: "Note printing", recordedById: manager.id,
      },
    );
  }
  await db.expense.createMany({ data: expenseRows });
  console.log(`  notes / distributions / expenses  ${notes.length} / ${distributionRows.length} / ${expenseRows.length}`);

  /* ── Public content ──────────────────────────────────────────────────── */
  await db.announcement.createMany({
    data: [
      { content: `HSC ${CURRENT_YEAR + 1} ব্যাচের ভর্তি চলছে — আসন সীমিত। বিস্তারিত জানতে যোগাযোগ করুন।`, isActive: true, createdById: admin.id },
      { content: "সাপ্তাহিক মডেল টেস্ট প্রতি শুক্রবার সকাল ৯টায় অনুষ্ঠিত হবে।", isActive: true, createdById: admin.id },
      { content: "ঈদের ছুটি শেষে ক্লাস যথারীতি শুরু হবে।", isActive: false, createdById: admin.id },
    ],
  });

  /* ── SMS templates (all inactive; delivery is off) ───────────────────── */
  const categories = Object.keys(DEFAULT_SMS_TEMPLATES) as (keyof typeof DEFAULT_SMS_TEMPLATES)[];
  await db.smsTemplate.createMany({
    data: categories.map((category) => ({
      category,
      isActive: false,
      studentTemplate: DEFAULT_SMS_TEMPLATES[category].student,
      parentTemplate: DEFAULT_SMS_TEMPLATES[category].parent,
      sendToStudent: true,
      sendToParent: false,
      sendToTest: false,
      updatedById: admin.id,
    })),
  });

  await db.appSetting.createMany({
    data: [
      { key: "sms.enabled", value: false, updatedById: admin.id },
      {
        key: "site.contact",
        value: { phone: "01700000000", email: "hello@coachdesk.test", address: "Dhanmondi, Dhaka" },
        updatedById: admin.id,
      },
    ],
  });
  console.log(`  announcements / sms templates     3 / ${categories.length}`);

  console.log("\nDone. Sign in with:\n");
  console.log("  admin@coachdesk.test     Password123!   full access");
  console.log("  manager@coachdesk.test   Password123!   no users / SMS / public site");
  console.log("  staff@coachdesk.test     Password123!   students + attendance only\n");
  void ymd;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
