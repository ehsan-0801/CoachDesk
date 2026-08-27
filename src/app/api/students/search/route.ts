import { NextResponse } from "next/server";

import { ApiError, apiPermission } from "@/server/auth";
import { searchStudentOptions } from "@/server/queries/students";

/** Typeahead endpoint for the student pickers. Read-only, and gated on the same
 *  `students:view` grant as the list page. */
export async function GET(request: Request) {
  try {
    await apiPermission("students", "view");

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";
    if (query.length < 1) return NextResponse.json({ students: [] });

    const students = await searchStudentOptions(query, {
      includeArchived: searchParams.get("archived") === "true",
      limit: 15,
    });

    return NextResponse.json({
      students: students.map((student) => ({
        id: student.id,
        name: student.name,
        studentUid: student.studentUid,
        phone: student.phone,
        archived: student.archived,
        isModelTest: student.isModelTest,
        batchLabel: student.batch?.name ?? (student.batch ? `#${student.batch.batchNumber}` : null),
      })),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
