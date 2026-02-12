import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail, getUserFromSession } from "@/lib/helpers";

// GET /api/holiday-sets — list all holiday sets with holidays
export async function GET() {
    const { error, session } = await getSessionOrFail();
    if (error) return error;

    const sets = await prisma.holidaySet.findMany({
        include: {
            holidays: { orderBy: { startDate: "asc" } },
            _count: { select: { sites: true } },
        },
        orderBy: { name: "asc" },
    });
    return NextResponse.json(sets);
}

// POST /api/holiday-sets — create a holiday set or add a holiday to a set
export async function POST(req: NextRequest) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);

    if (user.role !== "ADMIN" && user.role !== "SITE_MANAGER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Create a new holiday set
    if (body.action === "createSet") {
        const set = await prisma.holidaySet.create({
            data: { name: body.name },
            include: { holidays: true, _count: { select: { sites: true } } },
        });
        return NextResponse.json(set, { status: 201 });
    }

    // Add a holiday to an existing set
    if (body.action === "addHoliday") {
        const holiday = await prisma.holiday.create({
            data: {
                name: body.name,
                startDate: new Date(body.startDate),
                endDate: new Date(body.endDate),
                schoolYear: body.schoolYear,
                holidaySetId: body.holidaySetId,
            },
        });
        return NextResponse.json(holiday, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// DELETE /api/holiday-sets?id=xxx&type=set|holiday
export async function DELETE(req: NextRequest) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);

    if (user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type") || "holiday";

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    if (type === "set") {
        await prisma.holidaySet.delete({ where: { id } });
    } else {
        await prisma.holiday.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
}
