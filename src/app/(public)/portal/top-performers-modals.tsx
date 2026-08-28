"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/ui/table";
import { useI18n } from "@/components/providers/i18n-provider";
import { formatNumber } from "@/lib/i18n";

type TopPerformer = {
  id: number;
  name: string;
  studentUid: string | null;
  batchName: string | null;
  totalMarks: number;
  examCount: number;
};

type Props = {
  topPerformersAllBatches: TopPerformer[];
  topPerformersBatch: TopPerformer[];
  currentStudentId: number;
  locale: "bn" | "en";
};

export function TopPerformersModals({
  topPerformersAllBatches,
  topPerformersBatch,
  currentStudentId,
  locale,
}: Props) {
  const { t } = useI18n();
  const [showAllModal, setShowAllModal] = React.useState(false);
  const [showBatchModal, setShowBatchModal] = React.useState(false);

  // Calculate ranks with tie handling (same marks = same rank, no skipping)
  const calculateRanksWithTies = (students: TopPerformer[]) => {
    const rankedStudents: Array<TopPerformer & { rank: number }> = [];
    let currentRank = 1;

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      
      // If not the first student and marks are different from previous, update rank
      if (i > 0 && student.totalMarks !== students[i - 1].totalMarks) {
        currentRank = i + 1;
      }
      
      rankedStudents.push({ ...student, rank: currentRank });
    }
    
    return rankedStudents;
  };

  const rankedAll = calculateRanksWithTies(topPerformersAllBatches);
  const rankedBatch = calculateRanksWithTies(topPerformersBatch);

  return (
    <>
      {/* Buttons */}
      <div className="flex flex-wrap gap-3">
        {topPerformersAllBatches.length > 0 && (
          <Button variant="outline" onClick={() => setShowAllModal(true)}>
            {t.portal.topPerformersAll}
          </Button>
        )}
        {topPerformersBatch.length > 0 && (
          <Button variant="outline" onClick={() => setShowBatchModal(true)}>
            {t.portal.topPerformersBatch}
          </Button>
        )}
      </div>

      {/* Modal for All Batches */}
      {showAllModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowAllModal(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl overflow-auto rounded-[--radius-retro] border-2 border-line bg-surface p-6 retro-shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAllModal(false)}
              className="absolute right-4 top-4 rounded-full p-1 hover:bg-surface-2"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
            <h2 className="mb-4 text-xl font-bold">{t.portal.topPerformersAll}</h2>
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>{t.portal.rank}</TH>
                    <TH>{t.students.studentName}</TH>
                    <TH>{t.students.studentId}</TH>
                    <TH>{t.batches.title}</TH>
                    <TH className="text-right">{t.portal.exams}</TH>
                    <TH className="text-right">{t.portal.totalMarks}</TH>
                  </TR>
                </THead>
                <TBody>
                  {rankedAll.map((student) => (
                    <TR
                      key={student.id}
                      className={student.id === currentStudentId ? "bg-primary/10" : ""}
                    >
                      <TD className="font-bold">{formatNumber(student.rank, locale)}</TD>
                      <TD className="font-medium">{student.name}</TD>
                      <TD className="text-muted">{student.studentUid ?? "—"}</TD>
                      <TD className="text-sm text-muted">{student.batchName ?? "—"}</TD>
                      <TD className="text-right tabular-nums">{formatNumber(student.examCount, locale)}</TD>
                      <TD className="text-right font-bold tabular-nums">
                        {formatNumber(student.totalMarks, locale)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          </div>
        </div>
      )}

      {/* Modal for Batch */}
      {showBatchModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowBatchModal(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-[--radius-retro] border-2 border-line bg-surface p-6 retro-shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowBatchModal(false)}
              className="absolute right-4 top-4 rounded-full p-1 hover:bg-surface-2"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
            <h2 className="mb-4 text-xl font-bold">{t.portal.topPerformersBatch}</h2>
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>{t.portal.rank}</TH>
                    <TH>{t.students.studentName}</TH>
                    <TH>{t.students.studentId}</TH>
                    <TH className="text-right">{t.portal.exams}</TH>
                    <TH className="text-right">{t.portal.totalMarks}</TH>
                  </TR>
                </THead>
                <TBody>
                  {rankedBatch.map((student) => (
                    <TR
                      key={student.id}
                      className={student.id === currentStudentId ? "bg-primary/10" : ""}
                    >
                      <TD className="font-bold">{formatNumber(student.rank, locale)}</TD>
                      <TD className="font-medium">{student.name}</TD>
                      <TD className="text-muted">{student.studentUid ?? "—"}</TD>
                      <TD className="text-right tabular-nums">{formatNumber(student.examCount, locale)}</TD>
                      <TD className="text-right font-bold tabular-nums">
                        {formatNumber(student.totalMarks, locale)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          </div>
        </div>
      )}
    </>
  );
}
