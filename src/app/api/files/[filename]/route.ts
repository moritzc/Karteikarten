import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail, getUserFromSession } from "@/lib/helpers";
import path from "path";
import { readFile, stat } from "fs/promises";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { filename: string } }) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);
    const filename = params.filename;

    // Security Check: Prevent directory traversal attacks
    if (filename.includes("..") || filename.includes("/")) {
        return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    // 1. Find the file record in DB to check ownership/permissions
    const fileRecord = await prisma.file.findFirst({
        where: { url: `/api/files/${filename}` },
        include: {
            entry: { include: { student: { include: { sites: true } } } },
            student: { include: { sites: true } },
        },
    });

    if (!fileRecord) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // 2. Authorization Logic
    let isAuthorized = false;

    if (user.role === "ADMIN") {
        isAuthorized = true;
    } else if (user.role === "SITE_MANAGER") {
        // Site Manager can see files if the student belongs to one of their sites
        const student = fileRecord.entry?.student || fileRecord.student;
        if (student) {
            // Get user's sites
            const userSites = await prisma.site.findMany({
                where: { users: { some: { id: user.id } } },
                select: { id: true },
            });
            const userSiteIds = new Set(userSites.map(s => s.id));

            // Check intersection
            const studentSiteIds = student.sites.map(s => s.id);
            if (studentSiteIds.some(id => userSiteIds.has(id))) {
                isAuthorized = true;
            }
        }
    } else if (user.role === "TEACHER") {
        // Teachers can see files if the student is associated with a site they work at
        const student = fileRecord.entry?.student || fileRecord.student;
        if (student) {
             const userSites = await prisma.site.findMany({
                where: { users: { some: { id: user.id } } },
                select: { id: true },
            });
            const userSiteIds = new Set(userSites.map(s => s.id));
            if (student.sites.some(s => userSiteIds.has(s.id))) {
                isAuthorized = true;
            }
        }
    }

    if (!isAuthorized) {
        await createAuditLog({
            action: "FILE_ACCESS_DENIED",
            details: `User ${user.email} attempted to access ${filename}`,
            userId: user.id,
            resourceId: fileRecord.id
        });
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Serve the file
    try {
        const filePath = path.join(process.cwd(), "uploads", filename);

        // Check if file exists
        await stat(filePath);

        const fileBuffer = await readFile(filePath);

        // Audit Log
        await createAuditLog({
            action: "FILE_ACCESS",
            details: `User ${user.email} accessed ${filename}`,
            userId: user.id,
            resourceId: fileRecord.id
        });

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": fileRecord.type || "application/octet-stream",
                "Content-Disposition": `inline; filename="${fileRecord.name}"`,
            },
        });
    } catch (err) {
        console.error("File read error:", err);
        return NextResponse.json({ error: "File not found on server" }, { status: 404 });
    }
}
