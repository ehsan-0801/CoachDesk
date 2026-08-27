import { NextResponse } from "next/server";

import { db } from "@/server/db";

/**
 * Public search endpoint for the student portal.
 * Returns matching students based on name, student ID, or phone numbers.
 * No authentication required - this is a public lookup.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";

    console.log("[Portal Search API] Query:", query);

    if (query.length < 1) {
      console.log("[Portal Search API] Query too short");
      return NextResponse.json({ results: [] });
    }

    // Search for students matching the query
    const students = await db.student.findMany({
      where: {
        archived: false, // Only active students
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { studentUid: { contains: query, mode: "insensitive" } },
          { phone: { contains: query } },
          { parentPhone: { contains: query } },
        ],
      },
      select: {
        id: true,
        name: true,
        studentUid: true,
        phone: true,
        batch: {
          select: {
            name: true,
            batchNumber: true,
          },
        },
      },
      take: 15, // Show more results
      orderBy: {
        name: "asc",
      },
    });

    console.log("[Portal Search API] Found students:", students.length);

    return NextResponse.json({
      results: students.map((student) => ({
        id: student.id,
        name: student.name,
        studentUid: student.studentUid,
        phone: student.phone,
        batchName: student.batch?.name ?? (student.batch ? `Batch ${student.batch.batchNumber}` : null),
      })),
    });
  } catch (error) {
    console.error("[Portal Search API] Error:", error);
    return NextResponse.json({ error: "Search failed", results: [] }, { status: 500 });
  }
}
