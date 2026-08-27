import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/misc";
import { getI18n } from "@/lib/i18n/server";
import { isoDate } from "@/lib/utils";
import { admitStudent } from "@/server/actions/students";
import { requirePermission } from "@/server/auth";
import { listActiveBatches } from "@/server/queries/batches";
import { collegeOptions } from "@/server/queries/colleges";
import { nextStudentUid } from "@/server/queries/students";

import { StudentForm } from "../student-form";

export const metadata = { title: "New admission" };

export default async function AdmissionPage() {
  await requirePermission("students", "create");
  const { t } = await getI18n();

  const [batches, colleges] = await Promise.all([listActiveBatches(), collegeOptions()]);

  if (!batches.length) {
    return (
      <>
        <PageHeader title={t.students.admission} />
        <EmptyState title={t.batches.empty} description={t.students.selectBatchFirst} />
      </>
    );
  }

  const defaultBatch = batches[0];
  const suggestedUid = await nextStudentUid(defaultBatch.hscYear);

  return (
    <>
      <PageHeader title={t.students.admission} description={t.students.subtitle} />
      <StudentForm
        action={admitStudent}
        submitLabel={t.students.admission}
        successMessage={t.students.created}
        showCollectionToggles
        batches={batches.map((batch) => ({
          id: batch.id,
          label: batch.name ?? `${t.batches.title} ${batch.batchNumber}`,
          hscYear: batch.hscYear,
          tuitionFee: batch.tuitionFee,
          admissionFee: batch.admissionFee,
        }))}
        colleges={colleges.map((college) => ({
          id: college.id,
          label: college.shortName ? `${college.name} (${college.shortName})` : college.name,
        }))}
        defaults={{
          studentUid: suggestedUid,
          name: "",
          phone: "",
          parentName: "",
          parentPhone: "",
          collegeId: "",
          collegeRoll: "",
          hscYear: defaultBatch.hscYear,
          gender: "",
          division: "",
          courseType: "",
          admissionDate: isoDate(),
          admissionFee: defaultBatch.admissionFee,
          monthlyFee: defaultBatch.tuitionFee,
          modelTestFee: 500,
          batchId: String(defaultBatch.id),
          isModelTest: false,
          comment: "",
        }}
      />
    </>
  );
}
