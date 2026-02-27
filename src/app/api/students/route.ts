import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail, getUserFromSession } from "@/lib/helpers";
import { createAuditLog } from "@/lib/audit";

// GET /api/students?siteId=xxx
export async function GET(req: NextRequest) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");
    const search = searchParams.get("search");

    const includeArchived = searchParams.get("includeArchived") === "true";

    const where: any = { archived: includeArchived ? undefined : false };

    if (siteId) {
        where.sites = { some: { id: siteId } };
    } else if (user.role !== "ADMIN") {
        // Non-admins see students from their sites
        const userSites = await prisma.site.findMany({
            where: { users: { some: { id: user.id } } },
            select: { id: true },
        });
        where.sites = { some: { id: { in: userSites.map((s) => s.id) } } };
    }

    if (search) {
        where.OR = [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
        ];
    }

    const students = await prisma.student.findMany({
        where,
        include: {
            sites: { select: { id: true, name: true } },
            grades: { orderBy: { date: "desc" }, take: 5, include: { subject: true } },
            exams: { where: { date: { gte: new Date() } }, orderBy: { date: "asc" }, include: { subject: true } },
            _count: { select: { entries: true } },
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    return NextResponse.json(students);
}

// POST /api/students — create student (ADMIN or SITE_MANAGER)
export async function POST(req: NextRequest) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);

    if (user.role === "TEACHER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { firstName, lastName, birthDate, note, siteIds } = body;

    const student = await prisma.student.create({
        data: {
            firstName,
            lastName,
            birthDate: birthDate ? new Date(birthDate) : null,
            note: note || null,
            sites: siteIds?.length ? { connect: siteIds.map((id: string) => ({ id })) } : undefined,
        },
        include: { sites: { select: { id: true, name: true } } },
    });

    // Audit Log
    await createAuditLog({
        action: "STUDENT_CREATED",
        details: JSON.stringify({ firstName: student.firstName, lastName: student.lastName, id: student.id }),
        userId: user.id,
        resourceId: student.id
    });

    return NextResponse.json(student, { status: 201 });
}
