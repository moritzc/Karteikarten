
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    // Only SITE_MANAGER or ADMIN should be able to mark as done?
    // Teachers might want to edit? Let's restrict validation to role check if needed.

    if (!session) {
        return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const { isDone } = await req.json();

    try {
        const note = await prisma.teacherNote.update({
            where: { id: params.id },
            data: { isDone }
        });
        return NextResponse.json(note);
    } catch (error) {
        return NextResponse.json({ error: "Error updating note" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    // Check ownership or role

    try {
        await prisma.teacherNote.delete({
            where: { id: params.id }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Error deleting note" }, { status: 500 });
    }
}
