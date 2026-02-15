
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");

    // Filtering by status if needed, default to showing checks on frontend

    // Only fetch relevant notes
    // If Site Manager: fetch notes for sites they manage (or all if not restricted)
    // If Teacher: fetch their own created notes?

    const role = (session.user as any).role;

    try {
        let where: any = {};

        if (role === "TEACHER") {
            where.teacherId = (session.user as any).id;
        } else {
            if (siteId) where.siteId = siteId;

            const isDone = searchParams.get("isDone");
            if (isDone === "true") where.isDone = true;
            if (isDone === "false") where.isDone = false;

            const fromDate = searchParams.get("from");
            if (fromDate) where.createdAt = { gte: new Date(fromDate) };
        }

        const notes = await prisma.teacherNote.findMany({
            where,
            include: {
                student: true,
                teacher: {
                    select: { name: true, email: true }
                },
                site: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(notes);
    } catch (error) {
        console.error("Error fetching notes:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "TEACHER") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { studentId, content } = body;
        let { siteId } = body;

        if (!studentId || !content) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        if (!siteId) {
            const student = await prisma.student.findUnique({ where: { id: studentId }, select: { siteId: true } });
            if (student) siteId = student.siteId;
        }

        const note = await prisma.teacherNote.create({
            data: {
                content,
                studentId,
                siteId,
                teacherId: (session.user as any).id,
            }
        });

        return NextResponse.json(note);
    } catch (error) {
        console.error("Error creating note:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
