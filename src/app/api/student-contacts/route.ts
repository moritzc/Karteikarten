import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail, getUserFromSession } from "@/lib/helpers";

// GET /api/student-contacts?studentId=xxx
export async function GET(req: NextRequest) {
    const { error } = await getSessionOrFail();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

    const contacts = await prisma.studentContact.findMany({
        where: { studentId },
        orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(contacts);
}

// POST /api/student-contacts
export async function POST(req: NextRequest) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);
    if (user.role === "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { studentId, type, value, label } = body;

    if (!studentId || !type || !value) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const contact = await prisma.studentContact.create({
        data: { studentId, type, value, label: label || null },
    });
    return NextResponse.json(contact, { status: 201 });
}

// DELETE /api/student-contacts?id=xxx
export async function DELETE(req: NextRequest) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);
    if (user.role === "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await prisma.studentContact.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
