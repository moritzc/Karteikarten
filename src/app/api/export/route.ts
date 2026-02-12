import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail, getUserFromSession } from "@/lib/helpers";

// GET /api/export?siteId=xxx — export data as JSON
export async function GET(req: NextRequest) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");

    if (user.role !== "ADMIN" && user.role !== "SITE_MANAGER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const siteWhere: any = {};
    if (siteId) siteWhere.id = siteId;
    if (user.role === "SITE_MANAGER") {
        const userSites = await prisma.site.findMany({
            where: { users: { some: { id: user.id } } },
            select: { id: true },
        });
        if (siteId && !userSites.find((s) => s.id === siteId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        siteWhere.id = { in: userSites.map((s) => s.id) };
    }

    const sites = await prisma.site.findMany({
        where: siteWhere,
        include: {
            users: { select: { id: true, name: true, email: true, role: true } },
            students: {
                include: {
                    entries: { include: { subject: true, teacher: { select: { name: true } }, files: true } },
                    grades: { include: { subject: true } },
                    exams: { include: { subject: true } },
                },
            },
            sessions: {
                include: {
                    teacher: { select: { name: true } },
                    subjects: true,
                    students: { select: { firstName: true, lastName: true } },
                },
            },
        },
    });

    const subjects = await prisma.subject.findMany();

    const exportData = {
        exportDate: new Date().toISOString(),
        sites,
        subjects,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="export-${new Date().toISOString().slice(0, 10)}.json"`,
        },
    });
}
