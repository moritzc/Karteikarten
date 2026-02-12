import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail, getUserFromSession } from "@/lib/helpers";

// GET /api/sites — list sites for current user
export async function GET() {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);

    if (user.role === "ADMIN") {
        const sites = await prisma.site.findMany({
            include: { _count: { select: { users: true, students: true, sessions: true, rooms: true } } },
            orderBy: { name: "asc" },
        });
        return NextResponse.json(sites);
    }

    // SITE_MANAGER and TEACHER see only their sites
    const sites = await prisma.site.findMany({
        where: { users: { some: { id: user.id } } },
        include: { _count: { select: { users: true, students: true, sessions: true, rooms: true } } },
        orderBy: { name: "asc" },
    });
    return NextResponse.json(sites);
}

// POST /api/sites — create site (ADMIN only)
export async function POST(req: NextRequest) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);

    if (user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const site = await prisma.site.create({
        data: { name: body.name, address: body.address || null },
    });
    return NextResponse.json(site, { status: 201 });
}
