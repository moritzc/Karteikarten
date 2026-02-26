import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail } from "@/lib/helpers";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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
    const { error } = await getSessionOrFail();
    if (error) return error;

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

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadsDir, { recursive: true });

        // Generate unique filename
        const uniqueName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const filePath = path.join(uploadsDir, uniqueName);
        await writeFile(filePath, buffer);

        const fileRecord = await prisma.file.create({
            data: {
                url: `/uploads/${uniqueName}`,
                name: file.name,
                type: file.type || null,
                size: buffer.length,
                entryId: entryId || null,
                studentId: studentId || null,
            },
        });

        return NextResponse.json(fileRecord, { status: 201 });
    } catch (err: any) {
        console.error("Upload error:", err);
        return NextResponse.json({ error: "Upload failed", details: err.message }, { status: 500 });
    }
}

// DELETE /api/upload?id=xxx — delete a file
export async function DELETE(req: NextRequest) {
    const { error } = await getSessionOrFail();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "No file ID" }, { status: 400 });

    try {
        // Delete file record (actual file on disk could also be deleted)
        await prisma.file.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
}
