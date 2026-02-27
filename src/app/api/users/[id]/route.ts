import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail, getUserFromSession } from "@/lib/helpers";
import bcrypt from "bcryptjs";
import { createAuditLog } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
    const { error } = await getSessionOrFail();
    if (error) return error;

    const user = await prisma.user.findUnique({
        where: { id: params.id },
        select: { id: true, name: true, email: true, role: true, teacherNote: true, teachableSubjects: { select: { id: true, name: true } }, sites: { select: { id: true, name: true } }, createdAt: true },
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(user);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const currentUser = getUserFromSession(session);
    if (currentUser.role === "TEACHER" && currentUser.id !== params.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data: any = {};
    if (body.name) data.name = body.name;
    if (body.email) data.email = body.email;
    if (body.password) {
        console.log(`Updating password for user ${params.id}`);
        data.password = await bcrypt.hash(body.password, 10);
    }
    if (body.role && currentUser.role === "ADMIN") data.role = body.role;
    if (body.siteIds) data.sites = { set: body.siteIds.map((id: string) => ({ id })) };
    if (body.teacherNote !== undefined) data.teacherNote = body.teacherNote;
    if (body.subjectIds) data.teachableSubjects = { set: body.subjectIds.map((id: string) => ({ id })) };

    const user = await prisma.user.update({
        where: { id: params.id },
        data,
        select: { id: true, name: true, email: true, role: true, teacherNote: true, teachableSubjects: { select: { id: true, name: true } }, sites: { select: { id: true, name: true } } },
    });

    // Audit Log
    await createAuditLog({
        action: "USER_UPDATED",
        details: JSON.stringify({ updatedFields: Object.keys(data), userId: user.id }),
        userId: currentUser.id,
        resourceId: user.id
    });

    return NextResponse.json(user);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Get user details before deletion for log
    const targetUser = await prisma.user.findUnique({ where: { id: params.id } });

    if (!targetUser) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.user.delete({ where: { id: params.id } });

    // Audit Log
    await createAuditLog({
        action: "USER_DELETED",
        details: JSON.stringify({ name: targetUser.name, email: targetUser.email }),
        userId: user.id,
        resourceId: params.id
    });

    return NextResponse.json({ success: true });
}
