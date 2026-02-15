import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail, getUserFromSession } from "@/lib/helpers";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
    const { error } = await getSessionOrFail();
    if (error) return error;

    const session = await prisma.session.findUnique({
        where: { id: params.id },
        include: {
            site: { select: { id: true, name: true } },
            teacher: { select: { id: true, name: true } },
            subjects: true,
            room: { select: { id: true, name: true } },
            students: {
                include: {
                    entries: { orderBy: { lessonDate: "desc" }, take: 3, include: { subject: true, teacher: { select: { name: true } } } },
                    grades: { orderBy: { date: "desc" }, take: 5, include: { subject: true } },
                    exams: { where: { date: { gte: new Date() } }, orderBy: { date: "asc" }, include: { subject: true } },
                },
            },
        },
    });

    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(session);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);

    const body = await req.json();
    const data: any = {};
    if (body.teacherId !== undefined) data.teacherId = body.teacherId;
    if (body.managerNote !== undefined) data.managerNote = body.managerNote;
    if (body.completed !== undefined) data.completed = body.completed;
    if (body.startTime !== undefined) data.startTime = body.startTime;
    if (body.duration !== undefined) data.duration = body.duration;
    if (body.roomId !== undefined) data.roomId = body.roomId || null;
    if (body.studentIds) data.students = { set: body.studentIds.map((id: string) => ({ id })) };
    if (body.subjectIds) data.subjects = { set: body.subjectIds.map((id: string) => ({ id })) };
    if (body.date) data.date = new Date(body.date);

    // If updating teacher on recurring group (update all future instances)
    if (body.updateRecurringTeacher && body.recurringGroupId) {
        await prisma.session.updateMany({
            where: {
                recurringGroupId: body.recurringGroupId,
                date: { gte: new Date() },
            },
            data: { teacherId: body.teacherId },
        });
    }

    const updated = await prisma.session.update({
        where: { id: params.id },
        data,
        include: {
            site: { select: { id: true, name: true } },
            teacher: { select: { id: true, name: true } },
            subjects: true,
            room: { select: { id: true, name: true } },
            students: true,
        },
    });
    return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);
    if (user.role === "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const deleteMode = searchParams.get("deleteMode"); // "single" | "future"

    if (deleteMode === "future") {
        const currentSession = await prisma.session.findUnique({ where: { id: params.id } });

        if (currentSession?.recurringGroupId) {
            await prisma.session.deleteMany({
                where: {
                    recurringGroupId: currentSession.recurringGroupId,
                    date: { gte: currentSession.date }, // This deletes THIS and COMING sessions
                },
            });
            return NextResponse.json({ success: true, count: "Multiple" });
        }
    }

    await prisma.session.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
}
