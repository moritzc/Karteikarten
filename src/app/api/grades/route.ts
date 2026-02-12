import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail, getUserFromSession } from "@/lib/helpers";

// GET /api/grades?studentId=xxx&subjectId=xxx
export async function GET(req: NextRequest) {
    const { error } = await getSessionOrFail();
    if (error) return error;
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const subjectId = searchParams.get("subjectId");

    const where: any = {};
    if (studentId) where.studentId = studentId;
    if (subjectId) where.subjectId = subjectId;

    const grades = await prisma.grade.findMany({
        where,
        include: {
            subject: true,
            student: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { date: "desc" },
    });
    return NextResponse.json(grades);
}

// POST /api/grades
export async function POST(req: NextRequest) {
    const { error } = await getSessionOrFail();
    if (error) return error;

    const body = await req.json();
    const { studentId, subjectId, value, type, date } = body;

    const grade = await prisma.grade.create({
        data: {
            studentId,
            subjectId,
            value: parseInt(value),
            type: type || null,
            date: date ? new Date(date) : new Date(),
        },
        include: { subject: true, student: { select: { id: true, firstName: true, lastName: true } } },
    });
    return NextResponse.json(grade, { status: 201 });
}
