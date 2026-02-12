import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail } from "@/lib/helpers";

// GET /api/exams?studentId=xxx&subjectId=xxx&upcoming=true
export async function GET(req: NextRequest) {
    const { error } = await getSessionOrFail();
    if (error) return error;
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const subjectId = searchParams.get("subjectId");
    const upcoming = searchParams.get("upcoming");
    const studentIds = searchParams.get("studentIds"); // comma separated

    const where: any = {};
    if (studentId) where.studentId = studentId;
    if (studentIds) where.studentId = { in: studentIds.split(",") };
    if (subjectId) where.subjectId = subjectId;
    if (upcoming === "true") where.date = { gte: new Date() };

    const exams = await prisma.exam.findMany({
        where,
        include: {
            subject: true,
            student: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { date: "asc" },
    });
    return NextResponse.json(exams);
}

// POST /api/exams
export async function POST(req: NextRequest) {
    const { error } = await getSessionOrFail();
    if (error) return error;

    const body = await req.json();
    const { studentId, subjectId, date, description } = body;

    const exam = await prisma.exam.create({
        data: {
            studentId,
            subjectId,
            date: new Date(date),
            description: description || null,
        },
        include: { subject: true, student: { select: { id: true, firstName: true, lastName: true } } },
    });
    return NextResponse.json(exam, { status: 201 });
}
