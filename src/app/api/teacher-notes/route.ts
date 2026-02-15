
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
        } else if (siteId) {
            where.siteId = siteId;
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
        const { studentId, content, siteId } = await req.json();

        if (!studentId || !content) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
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
