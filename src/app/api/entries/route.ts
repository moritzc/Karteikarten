import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail, getUserFromSession } from "@/lib/helpers";

// GET /api/entries?studentId=xxx&subjectId=xxx&teacherId=xxx
export async function GET(req: NextRequest) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const subjectId = searchParams.get("subjectId");
    const teacherId = searchParams.get("teacherId");

    const where: any = {};
    if (studentId) where.studentId = studentId;
    if (subjectId) where.subjectId = subjectId;
    if (teacherId) where.teacherId = teacherId;

    const entries = await prisma.entry.findMany({
        where,
        include: {
            subject: true,
            teacher: { select: { id: true, name: true } },
            student: { select: { id: true, firstName: true, lastName: true } },
            files: true,
        },
        orderBy: { lessonDate: "desc" },
    });

    return NextResponse.json(entries);
}

// POST /api/entries — create entry (teachers fill out flash cards)
export async function POST(req: NextRequest) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);

    const body = await req.json();
    const { studentId, subjectId, topic, notes, homework, lessonDate } = body;

    const entry = await prisma.entry.create({
        data: {
            studentId,
            teacherId: user.id,
            subjectId: subjectId || null,
            topic: topic || null,
            notes: notes || null,
            homework: homework || null,
            lessonDate: lessonDate ? new Date(lessonDate) : new Date(),
        },
        include: {
            subject: true,
            teacher: { select: { id: true, name: true } },
            student: { select: { id: true, firstName: true, lastName: true } },
            files: true,
        },
    });

    return NextResponse.json(entry, { status: 201 });
}
