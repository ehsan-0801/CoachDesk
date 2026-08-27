-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'manager', 'staff');

-- CreateEnum
CREATE TYPE "app_module" AS ENUM ('dashboard', 'batches', 'students', 'attendance', 'exams', 'notes', 'payments', 'expenses', 'colleges', 'homepage', 'sms', 'users');

-- CreateEnum
CREATE TYPE "gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "attendance_status" AS ENUM ('present', 'absent');

-- CreateEnum
CREATE TYPE "attendance_source" AS ENUM ('regular', 'manual');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('cash', 'bkash', 'nagad', 'rocket', 'bank', 'other');

-- CreateEnum
CREATE TYPE "exam_result_status" AS ENUM ('published', 'absent', 'draft');

-- CreateEnum
CREATE TYPE "exam_batch_status" AS ENUM ('active', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "sms_category" AS ENUM ('present', 'absent', 'manual_attendance', 'result', 'exam_absent', 'payment_confirmation', 'due_payment', 'admission_confirmation', 'batchwise');

-- CreateEnum
CREATE TYPE "sms_recipient" AS ENUM ('student', 'parent', 'test');

-- CreateEnum
CREATE TYPE "sms_status" AS ENUM ('pending', 'queued', 'sent', 'failed', 'skipped');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(190) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'staff',
    "phone" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "module" "app_module" NOT NULL,
    "can_view" BOOLEAN NOT NULL DEFAULT false,
    "can_create" BOOLEAN NOT NULL DEFAULT false,
    "can_update" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" VARCHAR(64) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "user_agent" TEXT,
    "ip_address" VARCHAR(64),
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colleges" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "short_name" VARCHAR(60),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "colleges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" SERIAL NOT NULL,
    "batch_number" INTEGER NOT NULL,
    "name" VARCHAR(120),
    "hsc_year" VARCHAR(8) NOT NULL,
    "days_in_week" TEXT[],
    "start_time" VARCHAR(8) NOT NULL,
    "end_time" VARCHAR(8) NOT NULL,
    "starting_date" DATE NOT NULL,
    "duration" VARCHAR(60),
    "tuition_fee" INTEGER NOT NULL DEFAULT 0,
    "admission_fee" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "info_line1" TEXT,
    "info_line2" TEXT,
    "hsc_year_color" VARCHAR(32),
    "info_line1_color" VARCHAR(32),
    "info_line2_color" VARCHAR(32),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" SERIAL NOT NULL,
    "student_uid" VARCHAR(32),
    "name" VARCHAR(160) NOT NULL,
    "phone" VARCHAR(20),
    "parent_name" VARCHAR(160),
    "parent_phone" VARCHAR(20),
    "college_id" INTEGER,
    "college_roll" VARCHAR(40),
    "hsc_year" VARCHAR(8) NOT NULL,
    "gender" "gender",
    "division" VARCHAR(60),
    "course_type" VARCHAR(80),
    "course_chapters" JSONB,
    "admission_date" DATE NOT NULL,
    "admission_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "monthly_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "model_test_fee" DECIMAL(10,2),
    "batch_id" INTEGER,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "is_model_test" BOOLEAN NOT NULL DEFAULT false,
    "is_name_verified" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes_held" (
    "id" SERIAL NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "class_date" DATE NOT NULL,
    "recorded_by" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classes_held_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "batch_id" INTEGER,
    "attendance_date" DATE NOT NULL,
    "status" "attendance_status" NOT NULL,
    "source" "attendance_source" NOT NULL DEFAULT 'regular',
    "remarks" TEXT,
    "recorded_by" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "is_model_test" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "fee_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "batch_id" INTEGER,
    "fee_type_id" INTEGER,
    "payment_type" VARCHAR(120) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "payment_month" INTEGER,
    "payment_year" INTEGER,
    "method" "payment_method" NOT NULL DEFAULT 'cash',
    "is_model_test" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "recorded_by" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" SERIAL NOT NULL,
    "expense_type_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER,
    "note_id" INTEGER,
    "note_type" VARCHAR(80),
    "print_type" VARCHAR(80),
    "description" TEXT,
    "expense_date" DATE NOT NULL,
    "recorded_by" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_distributions" (
    "id" SERIAL NOT NULL,
    "note_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "distributed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "distributed_by" INTEGER,

    CONSTRAINT "note_distributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" SERIAL NOT NULL,
    "exam_name" VARCHAR(160) NOT NULL,
    "subject_name" VARCHAR(120),
    "paper_number" VARCHAR(40),
    "chapter" VARCHAR(200),
    "exam_type" VARCHAR(80),
    "mcq_marks" INTEGER NOT NULL DEFAULT 0,
    "cq_marks" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_batches" (
    "id" SERIAL NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "exam_date" DATE NOT NULL,
    "start_time" VARCHAR(8),
    "end_time" VARCHAR(8),
    "status" "exam_batch_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "exam_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_results" (
    "id" SERIAL NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "batch_id" INTEGER,
    "mcq_marks" INTEGER,
    "cq_marks" INTEGER,
    "total_marks" INTEGER NOT NULL DEFAULT 0,
    "status" "exam_result_status" NOT NULL DEFAULT 'published',
    "recorded_by" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "exam_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" VARCHAR(80) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" INTEGER,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "sms_templates" (
    "id" SERIAL NOT NULL,
    "category" "sms_category" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "student_template" TEXT NOT NULL,
    "parent_template" TEXT,
    "send_to_student" BOOLEAN NOT NULL DEFAULT true,
    "send_to_parent" BOOLEAN NOT NULL DEFAULT false,
    "send_to_test" BOOLEAN NOT NULL DEFAULT false,
    "test_phone" VARCHAR(20),
    "updated_by" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sms_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_messages" (
    "id" SERIAL NOT NULL,
    "category" "sms_category" NOT NULL,
    "recipient_type" "sms_recipient" NOT NULL,
    "student_id" INTEGER,
    "batch_id" INTEGER,
    "phone" VARCHAR(20) NOT NULL,
    "body" TEXT NOT NULL,
    "status" "sms_status" NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "provider_ref" VARCHAR(120),
    "context" JSONB,
    "requested_by" INTEGER,
    "sent_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_user_id_module_key" ON "user_permissions"("user_id", "module");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "colleges_name_key" ON "colleges"("name");

-- CreateIndex
CREATE UNIQUE INDEX "batches_batch_number_key" ON "batches"("batch_number");

-- CreateIndex
CREATE INDEX "batches_archived_idx" ON "batches"("archived");

-- CreateIndex
CREATE INDEX "batches_hsc_year_idx" ON "batches"("hsc_year");

-- CreateIndex
CREATE UNIQUE INDEX "students_student_uid_key" ON "students"("student_uid");

-- CreateIndex
CREATE INDEX "students_batch_id_idx" ON "students"("batch_id");

-- CreateIndex
CREATE INDEX "students_archived_idx" ON "students"("archived");

-- CreateIndex
CREATE INDEX "students_hsc_year_idx" ON "students"("hsc_year");

-- CreateIndex
CREATE INDEX "students_name_idx" ON "students"("name");

-- CreateIndex
CREATE UNIQUE INDEX "classes_held_batch_id_class_date_key" ON "classes_held"("batch_id", "class_date");

-- CreateIndex
CREATE INDEX "attendances_attendance_date_idx" ON "attendances"("attendance_date");

-- CreateIndex
CREATE INDEX "attendances_batch_id_attendance_date_idx" ON "attendances"("batch_id", "attendance_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_student_id_attendance_date_key" ON "attendances"("student_id", "attendance_date");

-- CreateIndex
CREATE UNIQUE INDEX "fee_types_name_key" ON "fee_types"("name");

-- CreateIndex
CREATE INDEX "payments_student_id_idx" ON "payments"("student_id");

-- CreateIndex
CREATE INDEX "payments_payment_date_idx" ON "payments"("payment_date");

-- CreateIndex
CREATE INDEX "payments_student_id_payment_year_payment_month_idx" ON "payments"("student_id", "payment_year", "payment_month");

-- CreateIndex
CREATE UNIQUE INDEX "expense_types_name_key" ON "expense_types"("name");

-- CreateIndex
CREATE INDEX "expenses_expense_date_idx" ON "expenses"("expense_date");

-- CreateIndex
CREATE INDEX "expenses_expense_type_id_idx" ON "expenses"("expense_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "note_distributions_note_id_student_id_key" ON "note_distributions"("note_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_batches_exam_id_batch_id_key" ON "exam_batches"("exam_id", "batch_id");

-- CreateIndex
CREATE INDEX "exam_results_exam_id_batch_id_total_marks_idx" ON "exam_results"("exam_id", "batch_id", "total_marks");

-- CreateIndex
CREATE UNIQUE INDEX "exam_results_exam_id_student_id_key" ON "exam_results"("exam_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "sms_templates_category_key" ON "sms_templates"("category");

-- CreateIndex
CREATE INDEX "sms_messages_status_idx" ON "sms_messages"("status");

-- CreateIndex
CREATE INDEX "sms_messages_category_idx" ON "sms_messages"("category");

-- CreateIndex
CREATE INDEX "sms_messages_created_at_idx" ON "sms_messages"("created_at");

-- CreateIndex
CREATE INDEX "sms_messages_student_id_idx" ON "sms_messages"("student_id");

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_college_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes_held" ADD CONSTRAINT "classes_held_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes_held" ADD CONSTRAINT "classes_held_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_fee_type_id_fkey" FOREIGN KEY ("fee_type_id") REFERENCES "fee_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_expense_type_id_fkey" FOREIGN KEY ("expense_type_id") REFERENCES "expense_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_distributions" ADD CONSTRAINT "note_distributions_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_distributions" ADD CONSTRAINT "note_distributions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_distributions" ADD CONSTRAINT "note_distributions_distributed_by_fkey" FOREIGN KEY ("distributed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_batches" ADD CONSTRAINT "exam_batches_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_batches" ADD CONSTRAINT "exam_batches_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_templates" ADD CONSTRAINT "sms_templates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
