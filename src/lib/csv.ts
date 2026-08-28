/**
 * CSV generation for the dashboard's export buttons.
 *
 * The legacy app produced `.xlsx` via SheetJS on the client. We generate CSV on
 * the server instead: no dependency (the npm `xlsx` build carries known
 * advisories), and the export re-runs the query so it covers the whole filtered
 * set rather than just the page the user is looking at.
 */

export type CsvColumn<Row> = {
  header: string;
  /** Empty cells are written as an empty string, never "null"/"undefined". */
  value: (row: Row) => string | number | null | undefined;
};

/** Cap on exported rows, so a mis-filtered export can't try to stream the table. */
export const CSV_ROW_LIMIT = 20000;

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";

  const text = String(value);

  // A leading =, +, - or @ makes Excel treat the cell as a formula. Names and
  // phone numbers legitimately start with "+", so neutralise rather than strip.
  // Numbers are exempt: they can't carry a formula, and prefixing a negative
  // amount would land it in Excel as text instead of a number.
  const guarded =
    typeof value === "string" && /^[=+\-@]/.test(text) ? `'${text}` : text;

  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

export function toCsv<Row>(columns: readonly CsvColumn<Row>[], rows: readonly Row[]): string {
  const lines = [columns.map((column) => cell(column.header)).join(",")];

  for (const row of rows) {
    lines.push(columns.map((column) => cell(column.value(row))).join(","));
  }

  // CRLF and a UTF-8 BOM: without the BOM Excel reads the file as the system
  // codepage and mangles every Bangla label in it.
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** Filenames carry the date so repeated exports don't overwrite each other. */
export function csvFilename(base: string, date = new Date()): string {
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  return `${base}-${stamp}.csv`;
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      // The quoted filename survives the spaces and non-ASCII we may put in it.
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
