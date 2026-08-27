"use client";

import { useRouter } from "next/navigation";

import { useI18n } from "@/components/providers/i18n-provider";
import { SimpleSelect } from "@/components/ui/select";

export function ResultFilters({
  exams,
  batches,
  examId,
  batchId,
}: {
  exams: { id: number; label: string }[];
  batches: { id: number; label: string }[];
  examId: string;
  batchId: string;
}) {
  const { t } = useI18n();
  const router = useRouter();

  function navigate(next: { exam?: string; batch?: string }) {
    const params = new URLSearchParams();
    // A new exam is assigned to different batches, so the batch filter resets.
    params.set("exam", next.exam ?? examId);
    const batch = next.exam ? "" : (next.batch ?? batchId);
    if (batch) params.set("batch", batch);
    router.replace(`/exams/results?${params}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <SimpleSelect
        value={examId}
        onValueChange={(value) => navigate({ exam: value })}
        placeholder={t.exams.examName}
        options={exams.map((exam) => ({ value: String(exam.id), label: exam.label }))}
        className="w-56"
      />
      <SimpleSelect
        value={batchId}
        onValueChange={(value) => navigate({ batch: value })}
        placeholder={t.common.all}
        options={[
          { value: "", label: t.common.all },
          ...batches.map((batch) => ({ value: String(batch.id), label: batch.label })),
        ]}
        className="w-48"
      />
    </div>
  );
}
