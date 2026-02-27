import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail, getUserFromSession } from "@/lib/helpers";
import { createAuditLog } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
    const { error } = await getSessionOrFail();
    if (error) return error;

    const student = await prisma.student.findUnique({
        where: { id: params.id },
        include: {
            sites: { select: { id: true, name: true } },
            contacts: { orderBy: { createdAt: "asc" } },
            entries: {
                orderBy: { lessonDate: "desc" },
                include: {
                    subject: true,
                    teacher: { select: { id: true, name: true } },
                    files: true,
                },
            },
            grades: { orderBy: { date: "desc" }, include: { subject: true } },
            exams: { orderBy: { date: "asc" }, include: { subject: true } },
            reportCardGrades: {
                include: { subject: true },
                orderBy: [{ schoolYear: "desc" }, { semester: "desc" }],
            },
            files: { orderBy: { createdAt: "desc" } },
        },
    });

    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(student);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);

    const body = await req.json();
    const data: any = {};

    // Teachers can only update reportCardGrades through the dedicated API
    // Master data editable by Admin and Site Manager only
    if (user.role !== "TEACHER") {
        if (body.firstName !== undefined) data.firstName = body.firstName;
        if (body.lastName !== undefined) data.lastName = body.lastName;
        if (body.birthDate !== undefined) data.birthDate = body.birthDate ? new Date(body.birthDate) : null;
        if (body.note !== undefined) data.note = body.note;
        if (body.guardianName !== undefined) data.guardianName = body.guardianName;
        if (body.school !== undefined) data.school = body.school;
        if (body.gradeLevel !== undefined) data.gradeLevel = body.gradeLevel;
        if (body.siteIds) data.sites = { set: body.siteIds.map((id: string) => ({ id })) };
        if (body.archived !== undefined) data.archived = body.archived;
    } else {
        // Teachers may only update notes (not master data)
        if (body.note !== undefined) data.note = body.note;
    }

    if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
    }

    const student = await prisma.student.update({
        where: { id: params.id },
        data,
        include: {
            sites: { select: { id: true, name: true } },
            contacts: true,
        },
    });

    // Audit Log
    await createAuditLog({
        action: "STUDENT_UPDATED",
        details: JSON.stringify({ updatedFields: Object.keys(data), studentId: student.id }),
        userId: user.id,
        resourceId: student.id
    });

    return NextResponse.json(student);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);
    if (user.role === "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Get student details before deletion
    const student = await prisma.student.findUnique({ where: { id: params.id } });
    if (!student) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.student.delete({ where: { id: params.id } });

    // Audit Log
    await createAuditLog({
        action: "STUDENT_DELETED",
        details: JSON.stringify({ firstName: student.firstName, lastName: student.lastName, id: params.id }),
        userId: user.id,
        resourceId: params.id
    });

    return NextResponse.json({ success: true });
}
