/**
 * Re-exports the generated Prisma enums and model types under one import path.
 *
 * Client components must not pull in the Prisma runtime; importing *types* from
 * here keeps that boundary explicit and easy to audit.
 */
export {
  AppModule,
  AttendanceSource,
  AttendanceStatus,
  ExamBatchStatus,
  ExamResultStatus,
  Gender,
  PaymentMethod,
  SmsCategory,
  SmsRecipient,
  SmsStatus,
  UserRole,
} from "@prisma/client";

export type {
  Announcement,
  AppSetting,
  Attendance,
  Batch,
  ClassHeld,
  College,
  Exam,
  ExamBatch,
  ExamResult,
  Expense,
  ExpenseType,
  FeeType,
  Note,
  NoteDistribution,
  Payment,
  Prisma,
  Session,
  SmsMessage,
  SmsTemplate,
  Student,
  User,
  UserPermission,
} from "@prisma/client";
