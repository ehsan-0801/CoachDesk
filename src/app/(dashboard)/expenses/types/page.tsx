import { PageHeader } from "@/components/shell/page-header";
import { SimpleCrud } from "@/components/ui/simple-crud";
import { getI18n } from "@/lib/i18n/server";
import { can } from "@/lib/rbac";
import { deleteExpenseType, saveExpenseType } from "@/server/actions/expenses";
import { requirePermission } from "@/server/auth";
import { listExpenseTypes } from "@/server/queries/expenses";

export const metadata = { title: "Expense types" };

export default async function ExpenseTypesPage() {
  const user = await requirePermission("expenses", "create");
  const { t } = await getI18n();
  const types = await listExpenseTypes();

  return (
    <>
      <PageHeader title={t.expenses.expenseTypes} description={t.expenses.title} />
      <SimpleCrud
        rows={types.map((type) => ({ id: type.id, name: type.name, usageCount: type._count.expenses }))}
        createAction={saveExpenseType}
        deleteAction={deleteExpenseType}
        canCreate={can(user, "expenses", "create")}
        canDelete={can(user, "expenses", "delete")}
        labels={{
          nameLabel: t.expenses.expenseType,
          addLabel: t.common.add,
          emptyLabel: t.common.noResults,
          usageLabel: t.expenses.title,
        }}
      />
    </>
  );
}
