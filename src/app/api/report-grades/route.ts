import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail, getUserFromSession } from "@/lib/helpers";

// GET /api/report-grades?studentId=xxx
export async function GET(req: NextRequest) {
    const { error } = await getSessionOrFail();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

    const grades = await prisma.reportCardGrade.findMany({
        where: { studentId },
        include: { subject: true },
        orderBy: [{ schoolYear: "desc" }, { semester: "desc" }],
    });
    return NextResponse.json(grades);
}

// POST /api/report-grades — upsert a report card grade
export async function POST(req: NextRequest) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;

    const body = await req.json();
    const { studentId, subjectId, value, schoolYear, semester } = body;

    if (!studentId || !subjectId || !value || !schoolYear) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Upsert: create or update the grade for this student+subject+year+semester
    const grade = await prisma.reportCardGrade.upsert({
        where: {
            studentId_subjectId_schoolYear_semester: {
                studentId,
                subjectId,
                schoolYear,
                semester: semester || 1,
            },
        },
        update: { value: parseInt(value) },
        create: {
            studentId,
            subjectId,
            value: parseInt(value),
            schoolYear,
            semester: semester || 1,
        },
        include: { subject: true },
    });

    return NextResponse.json(grade);
}
