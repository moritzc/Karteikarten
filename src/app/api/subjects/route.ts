import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail } from "@/lib/helpers";

export async function GET() {
    const { error } = await getSessionOrFail();
    if (error) return error;

    const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(subjects);
}

export async function POST(req: NextRequest) {
    const { error } = await getSessionOrFail();
    if (error) return error;

    const body = await req.json();
    const subject = await prisma.subject.create({
        data: { name: body.name, color: body.color || null },
    });
    return NextResponse.json(subject, { status: 201 });
}
