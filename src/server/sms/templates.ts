import type { SmsCategory } from "@/lib/types";

/** Placeholders each category may use, surfaced in the template editor. */
export const SMS_PLACEHOLDERS: Record<SmsCategory, readonly string[]> = {
  present: ["student_name", "student_id", "batch_name", "date"],
  absent: ["student_name", "student_id", "batch_name", "date"],
  manual_attendance: ["student_name", "student_id", "batch_name", "date"],
  result: [
    "student_name", "student_id", "exam_name", "subject_name", "exam_date",
    "mcq_marks", "cq_marks", "total_marks",
    "exam_mcq_marks", "exam_cq_marks", "exam_total_marks", "highest_marks",
  ],
  exam_absent: ["student_name", "student_id", "exam_name", "exam_date", "batch_name"],
  payment_confirmation: ["student_name", "student_id", "payment_type", "amount", "date"],
  due_payment: ["student_name", "student_id", "payment_type", "due_amount", "month_count"],
  admission_confirmation: ["student_name", "student_id", "batch_name", "admission_fee", "date"],
  batchwise: ["student_name", "student_id", "batch_name", "message"],
};

export const DEFAULT_SMS_TEMPLATES: Record<SmsCategory, { student: string; parent: string }> = {
  present: {
    student: "Dear {student_name}-{student_id}, you were present in {batch_name} on {date}. - {sender}",
    parent: "Dear Parent, your child {student_name}-{student_id} was present in {batch_name} on {date}. - {sender}",
  },
  absent: {
    student: "Dear {student_name}-{student_id}, you were absent from {batch_name} on {date}. - {sender}",
    parent: "Dear Parent, your child {student_name}-{student_id} was absent from {batch_name} on {date}. - {sender}",
  },
  manual_attendance: {
    student: "Dear {student_name}-{student_id}, your attendance for {batch_name} on {date} has been recorded. - {sender}",
    parent: "Dear Parent, attendance for {student_name}-{student_id} in {batch_name} on {date} has been recorded. - {sender}",
  },
  result: {
    student:
      "Dear {student_name}-{student_id}, your {subject_name} {exam_name} result ({exam_date}): MCQ {mcq_marks}/{exam_mcq_marks}, CQ {cq_marks}/{exam_cq_marks}, Total {total_marks}/{exam_total_marks}. Highest {highest_marks}. - {sender}",
    parent:
      "Dear Parent, {student_name}-{student_id} scored MCQ {mcq_marks}/{exam_mcq_marks}, CQ {cq_marks}/{exam_cq_marks}, Total {total_marks}/{exam_total_marks} in {subject_name} {exam_name} ({exam_date}). Highest {highest_marks}. - {sender}",
  },
  exam_absent: {
    student: "Dear {student_name}-{student_id}, you were absent from the {exam_name} exam on {exam_date} ({batch_name}). - {sender}",
    parent: "Dear Parent, {student_name}-{student_id} was absent from the {exam_name} exam on {exam_date} ({batch_name}). - {sender}",
  },
  payment_confirmation: {
    student: "Dear {student_name}-{student_id}, we received {amount} BDT for {payment_type} on {date}. Thank you. - {sender}",
    parent: "Dear Parent, {amount} BDT received for {student_name}-{student_id} ({payment_type}) on {date}. - {sender}",
  },
  due_payment: {
    student: "Dear {student_name}-{student_id}, {due_amount} BDT is due for {month_count} month(s) of {payment_type}. Please pay soon. - {sender}",
    parent: "Dear Parent, {due_amount} BDT is due for {student_name}-{student_id} ({month_count} month(s) of {payment_type}). - {sender}",
  },
  admission_confirmation: {
    student: "Dear {student_name}-{student_id}, your admission to {batch_name} is confirmed. Admission fee {admission_fee} BDT. Starts {date}. - {sender}",
    parent: "Dear Parent, {student_name}-{student_id} has been admitted to {batch_name}. Admission fee {admission_fee} BDT. Starts {date}. - {sender}",
  },
  batchwise: {
    student: "Dear {student_name}-{student_id}, {message} - {sender}",
    parent: "Dear Parent, regarding {student_name}-{student_id}: {message} - {sender}",
  },
};

/** Replaces `{placeholder}` tokens. Unknown tokens are stripped rather than
 *  left in the body, so a stale template never texts a customer `{foo}`. */
export function renderTemplate(template: string, context: Record<string, string | number | null | undefined>): string {
  const merged: Record<string, string> = {
    sender: process.env.SMS_SENDER_NAME ?? "CoachDesk",
  };
  for (const [key, value] of Object.entries(context)) {
    merged[key] = value == null ? "" : String(value);
  }
  return template.replace(/\{(\w+)\}/g, (_, key: string) => merged[key] ?? "").replace(/\s{2,}/g, " ").trim();
}
