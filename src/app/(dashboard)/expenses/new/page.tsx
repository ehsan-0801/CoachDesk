import { PageHeader } from "@/components/shell/page-header";
import { getI18n } from "@/lib/i18n/server";
import { isoDate } from "@/lib/utils";
import { requirePermission } from "@/server/auth";
import { listExpenseTypes } from "@/server/queries/expenses";
import { listNotes } from "@/server/queries/notes";

import { ExpenseForm } from "../expense-form";

export const metadata = { title: "Record expense" };

export default async function NewExpensePage() {
  await requirePermission("expenses", "create");
  const { t } = await getI18n();

  const [expenseTypes, notes] = await Promise.all([listExpenseTypes(), listNotes()]);

  return (
    <>
      <PageHeader title={t.expenses.record} description={t.expenses.title} />
      <ExpenseForm
        expenseTypes={expenseTypes.map((type) => ({ id: type.id, name: type.name }))}
        notes={notes.map((note) => ({ id: note.id, name: note.name }))}
        today={isoDate()}
      />
    </>
  );
}
