import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail, getUserFromSession } from "@/lib/helpers";

// GET /api/rooms?siteId=xxx
export async function GET(req: NextRequest) {
    const { error } = await getSessionOrFail();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");

    const where: any = {};
    if (siteId) where.siteId = siteId;

    const rooms = await prisma.room.findMany({
        where,
        include: {
            site: { select: { id: true, name: true } },
            _count: { select: { sessions: true } },
        },
        orderBy: { name: "asc" },
    });

    return NextResponse.json(rooms);
}

// POST /api/rooms — create a room
export async function POST(req: NextRequest) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);

    if (user.role === "TEACHER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, siteId } = await req.json();
    if (!name || !siteId) {
        return NextResponse.json({ error: "Name and siteId required" }, { status: 400 });
    }

    const room = await prisma.room.create({
        data: { name, siteId },
        include: { site: { select: { id: true, name: true } } },
    });

    return NextResponse.json(room, { status: 201 });
}

// DELETE /api/rooms?id=xxx
export async function DELETE(req: NextRequest) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);

    if (user.role === "TEACHER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "No room ID" }, { status: 400 });

    await prisma.room.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
