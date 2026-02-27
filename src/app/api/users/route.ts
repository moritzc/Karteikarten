import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail, getUserFromSession } from "@/lib/helpers";
import bcrypt from "bcryptjs";
import { createAuditLog } from "@/lib/audit";

// GET /api/users — list users (filtered by role permissions)
export async function GET(req: NextRequest) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");
    const role = searchParams.get("role");

    const where: any = {};
    if (siteId) where.sites = { some: { id: siteId } };
    if (role) where.role = role;

    // SITE_MANAGER can only see users at their sites
    if (user.role === "SITE_MANAGER") {
        const userSites = await prisma.site.findMany({
            where: { users: { some: { id: user.id } } },
            select: { id: true },
        });
        const siteIds = userSites.map((s) => s.id);
        where.sites = { some: { id: { in: siteIds } } };
    } else if (user.role === "TEACHER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, role: true, teacherNote: true, teachableSubjects: { select: { id: true, name: true } }, sites: { select: { id: true, name: true } }, createdAt: true },
        orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
}

// POST /api/users — create user
export async function POST(req: NextRequest) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);

    const body = await req.json();
    const { email, name, password, role, siteIds } = body;

    // Admins can create SITE_MANAGERs and TEACHERs
    // SITE_MANAGERs can only create TEACHERs
    if (user.role === "SITE_MANAGER" && role !== "TEACHER") {
        return NextResponse.json({ error: "Site Managers can only create Teachers" }, { status: 403 });
    }
    if (user.role === "TEACHER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
        data: {
            email,
            name,
            password: hashedPassword,
            role: role || "TEACHER",
            teacherNote: body.teacherNote || null,
            sites: siteIds?.length ? { connect: siteIds.map((id: string) => ({ id })) } : undefined,
            teachableSubjects: body.subjectIds?.length ? { connect: body.subjectIds.map((id: string) => ({ id })) } : undefined,
        },
        select: { id: true, name: true, email: true, role: true, teacherNote: true, teachableSubjects: { select: { id: true, name: true } }, sites: { select: { id: true, name: true } } },
    });

    // Audit Log
    await createAuditLog({
        action: "USER_CREATED",
        details: JSON.stringify({ name: newUser.name, email: newUser.email, role: newUser.role }),
        userId: user.id,
        resourceId: newUser.id
    });

    return NextResponse.json(newUser, { status: 201 });
}
