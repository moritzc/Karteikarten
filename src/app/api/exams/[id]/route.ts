import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail } from "@/lib/helpers";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
    const { error } = await getSessionOrFail();
    if (error) return error;

    await prisma.exam.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const { error } = await getSessionOrFail();
    if (error) return error;

    const body = await req.json();
    const data: any = {};
    if (body.date) data.date = new Date(body.date);
    if (body.description !== undefined) data.description = body.description;
    if (body.subjectId) data.subjectId = body.subjectId;

    const exam = await prisma.exam.update({
        where: { id: params.id },
        data,
        include: { subject: true, student: { select: { id: true, firstName: true, lastName: true } } },
    });
    return NextResponse.json(exam);
}
