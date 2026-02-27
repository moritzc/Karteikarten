import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail, getUserFromSession } from "@/lib/helpers";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { createAuditLog } from "@/lib/audit";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

// POST /api/upload — upload file and link to entry or student
export async function POST(req: NextRequest) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const entryId = formData.get("entryId") as string | null;
        const studentId = formData.get("studentId") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
        }

        // Validate file type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Secure Uploads: Store in a private "uploads" directory (outside "public")
        // This prevents direct URL access and enforces API-mediated access control.
        const uploadsDir = path.join(process.cwd(), "uploads");
        await mkdir(uploadsDir, { recursive: true });

        // Generate unique filename
        const uniqueName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const filePath = path.join(uploadsDir, uniqueName);
        await writeFile(filePath, buffer);

        // Store API route URL instead of direct static path
        const fileRecord = await prisma.file.create({
            data: {
                url: `/api/files/${uniqueName}`, // Points to protected route
                name: file.name,
                type: file.type || null,
                size: buffer.length,
                entryId: entryId || null,
                studentId: studentId || null,
            },
        });

        // Audit Logging
        await createAuditLog({
            action: "FILE_UPLOAD",
            details: JSON.stringify({ filename: file.name, size: file.size, type: file.type }),
            userId: user.id,
            resourceId: fileRecord.id,
        });

        return NextResponse.json(fileRecord, { status: 201 });
    } catch (err: any) {
        console.error("Upload error:", err);
        return NextResponse.json({ error: "Upload failed", details: err.message }, { status: 500 });
    }
}

// DELETE /api/upload?id=xxx — delete a file
export async function DELETE(req: NextRequest) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "No file ID" }, { status: 400 });

    try {
        const fileRecord = await prisma.file.findUnique({ where: { id } });

        if (fileRecord) {
            // "Right to be Forgotten": Delete physical file from disk
            const filename = fileRecord.url.split("/").pop(); // Extract filename from /api/files/xyz
            if (filename) {
                const filePath = path.join(process.cwd(), "uploads", filename);
                try {
                    await unlink(filePath);
                } catch (fsError) {
                    console.warn(`Could not delete file from disk: ${filePath}`, fsError);
                    // Continue to delete record anyway
                }
            }

            // Delete database record
            await prisma.file.delete({ where: { id } });

            // Audit Logging
            await createAuditLog({
                action: "FILE_DELETE",
                details: JSON.stringify({ filename: fileRecord.name, url: fileRecord.url }),
                userId: user.id,
                resourceId: id,
            });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
}
