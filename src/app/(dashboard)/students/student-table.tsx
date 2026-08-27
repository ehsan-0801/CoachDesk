"use client";

import { Archive, ArchiveRestore, MoreVertical, Pencil, Repeat, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/misc";
import { SimpleSelect } from "@/components/ui/select";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { formatCurrency, formatDateShort } from "@/lib/i18n";
import {
  deleteStudent,
  setStudentArchived,
  toggleModelTest,
} from "@/server/actions/students";

export interface StudentRow {
  id: number;
  studentUid: string | null;
  name: string;
  phone: string | null;
  parentPhone: string | null;
  hscYear: string;
  gender: string | null;
  admissionDate: string;
  monthlyFee: number;
  archived: boolean;
  isModelTest: boolean;
  due: number;
  batchLabel: string | null;
  collegeLabel: string | null;
}

export function StudentTable({
  students,
  activeBatches,
  canUpdate,
  canDelete,
  showDues = true,
}: {
  students: StudentRow[];
  activeBatches: { id: number; label: string }[];
  canUpdate: boolean;
  canDelete: boolean;
  showDues?: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [dialog, setDialog] = React.useState<{
    kind: "archive" | "restore" | "modelTest" | "delete";
    student: StudentRow;
  } | null>(null);
  // Restoring an archived student needs a live batch to put them back into.
  const [restoreBatchId, setRestoreBatchId] = React.useState<string>("");

  async function run(promise: Promise<{ ok: boolean; error?: string }>, success: string) {
    const result = await promise;
    if (result.ok) {
      toast.success(success);
      router.refresh();
    } else {
      toast.error(result.error ?? t.common.error);
    }
    setDialog(null);
    setRestoreBatchId("");
  }

  if (!students.length) {
    return <EmptyState title={t.students.empty} />;
  }

  return (
    <>
      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH className="w-20">{t.students.studentId}</TH>
              <TH>{t.students.studentName}</TH>
              <TH>{t.students.batch}</TH>
              <TH>{t.common.phone}</TH>
              <TH>{t.students.admissionDate}</TH>
              {showDues ? <TH className="text-right">{t.students.duesLabel}</TH> : null}
              <TH className="w-12" />
            </TR>
          </THead>
          <TBody>
            {students.map((student) => (
              <TR key={student.id}>
                <TD className="font-bold tabular-nums">{student.studentUid ?? "—"}</TD>
                <TD>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link href={`/students/${student.id}`} className="font-medium underline-offset-2 hover:underline">
                      {student.name}
                    </Link>
                    {student.isModelTest ? <Badge variant="info">MT</Badge> : null}
                    {student.archived ? <Badge variant="neutral">{t.common.archived}</Badge> : null}
                  </div>
                  <span className="text-xs text-muted">
                    HSC {student.hscYear}
                    {student.collegeLabel ? ` · ${student.collegeLabel}` : ""}
                  </span>
                </TD>
                <TD className="whitespace-nowrap text-sm">{student.batchLabel ?? "—"}</TD>
                <TD className="whitespace-nowrap">
                  <span className="block text-sm tabular-nums">{student.phone ?? "—"}</span>
                  <span className="block text-xs tabular-nums text-muted">{student.parentPhone ?? "—"}</span>
                </TD>
                <TD className="whitespace-nowrap text-muted">{formatDateShort(student.admissionDate, locale)}</TD>
                {showDues ? (
                  <TD className="text-right">
                    {student.due > 0 ? (
                      <Badge variant="danger">{formatCurrency(student.due, locale)}</Badge>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </TD>
                ) : null}
                <TD className="text-right">
                  {canUpdate || canDelete ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={t.common.actions}>
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/students/${student.id}`}>
                            <Pencil /> {canUpdate ? t.common.edit : t.common.view}
                          </Link>
                        </DropdownMenuItem>
                        {canUpdate ? (
                          <>
                            <DropdownMenuItem
                              onSelect={() => setDialog({ kind: "modelTest", student })}
                            >
                              <Repeat />
                              {student.isModelTest ? t.students.convertToRegular : t.students.convertToModelTest}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                setDialog({ kind: student.archived ? "restore" : "archive", student })
                              }
                            >
                              {student.archived ? <ArchiveRestore /> : <Archive />}
                              {student.archived ? t.common.unarchive : t.common.archive}
                            </DropdownMenuItem>
                          </>
                        ) : null}
                        {canDelete ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem destructive onSelect={() => setDialog({ kind: "delete", student })}>
                              <Trash2 /> {t.common.delete}
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableWrap>

      <Confirm
        open={dialog?.kind === "archive"}
        onOpenChange={(next) => !next && setDialog(null)}
        title={t.common.archive}
        description={dialog?.student.name}
        confirmLabel={t.common.archive}
        onConfirm={() => run(setStudentArchived(dialog!.student.id, true), t.students.archivedToast)}
      />

      <Confirm
        open={dialog?.kind === "delete"}
        onOpenChange={(next) => !next && setDialog(null)}
        title={t.common.delete}
        description={dialog?.student.name}
        confirmLabel={t.common.delete}
        onConfirm={() => run(deleteStudent(dialog!.student.id), t.common.delete)}
      />

      <Confirm
        open={dialog?.kind === "modelTest"}
        onOpenChange={(next) => !next && setDialog(null)}
        title={
          dialog?.student.isModelTest ? t.students.convertToRegular : t.students.convertToModelTest
        }
        description={dialog?.student.name}
        variant="primary"
        onConfirm={() =>
          run(
            toggleModelTest(dialog!.student.id, restoreBatchId ? Number(restoreBatchId) : undefined),
            t.students.updated,
          )
        }
      />

      {/* Restoring asks for a destination batch: the student's old batch may
          itself be archived by now. */}
      <Confirm
        open={dialog?.kind === "restore"}
        onOpenChange={(next) => !next && setDialog(null)}
        title={t.common.unarchive}
        description={dialog?.student.name}
        variant="primary"
        confirmLabel={t.common.unarchive}
        confirmDisabled={!restoreBatchId}
        body={
          <SimpleSelect
            value={restoreBatchId}
            onValueChange={setRestoreBatchId}
            placeholder={t.students.selectBatchFirst}
            options={activeBatches.map((batch) => ({ value: String(batch.id), label: batch.label }))}
          />
        }
        onConfirm={() =>
          run(
            setStudentArchived(dialog!.student.id, false, Number(restoreBatchId)),
            t.students.restoredToast,
          )
        }
      />
    </>
  );
}
