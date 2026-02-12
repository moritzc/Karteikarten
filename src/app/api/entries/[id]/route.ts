import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail, getUserFromSession } from "@/lib/helpers";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
    const { error } = await getSessionOrFail();
    if (error) return error;

    const entry = await prisma.entry.findUnique({
        where: { id: params.id },
        include: {
            subject: true,
            teacher: { select: { id: true, name: true } },
            student: { select: { id: true, firstName: true, lastName: true } },
            files: true,
        },
    });

    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(entry);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);

    // Teachers can only edit their own entries
    const existing = await prisma.entry.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (user.role === "TEACHER" && existing.teacherId !== user.id) {
        return NextResponse.json({ error: "Can only edit your own entries" }, { status: 403 });
    }

    const body = await req.json();
    const data: any = {};
    if (body.topic !== undefined) data.topic = body.topic;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.homework !== undefined) data.homework = body.homework;
    if (body.subjectId !== undefined) data.subjectId = body.subjectId;
    if (body.lessonDate !== undefined) data.lessonDate = new Date(body.lessonDate);

    const entry = await prisma.entry.update({
        where: { id: params.id },
        data,
        include: {
            subject: true,
            teacher: { select: { id: true, name: true } },
            student: { select: { id: true, firstName: true, lastName: true } },
            files: true,
        },
    });
    return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);

    const existing = await prisma.entry.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (user.role === "TEACHER" && existing.teacherId !== user.id) {
        return NextResponse.json({ error: "Can only delete your own entries" }, { status: 403 });
    }

    await prisma.entry.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
}
