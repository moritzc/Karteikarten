import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail, getUserFromSession } from "@/lib/helpers";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;

    const site = await prisma.site.findUnique({
        where: { id: params.id },
        include: {
            users: { select: { id: true, name: true, email: true, role: true } },
            students: { include: { grades: true, exams: true } },
            holidaySet: { include: { holidays: { orderBy: { startDate: "asc" as const } } } },
        },
    });

    if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(site);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);
    if (user.role !== "ADMIN" && user.role !== "SITE_MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.address !== undefined) data.address = body.address;
    if (body.holidaySetId !== undefined) data.holidaySetId = body.holidaySetId || null;

    const site = await prisma.site.update({
        where: { id: params.id },
        data,
        include: { holidaySet: true },
    });
    return NextResponse.json(site);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.site.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
}
