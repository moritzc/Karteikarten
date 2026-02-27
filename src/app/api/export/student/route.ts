import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail, getUserFromSession } from "@/lib/helpers";
import { createAuditLog } from "@/lib/audit";

// GET /api/export/student?studentId=xxx&anonymizeTeachers=true
export async function GET(req: NextRequest) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);

    if (user.role !== "ADMIN" && user.role !== "SITE_MANAGER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const anonymizeTeachers = searchParams.get("anonymizeTeachers") === "true";

    if (!studentId) {
        return NextResponse.json({ error: "studentId required" }, { status: 400 });
    }

    // Load student with all related data
    const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
            sites: { select: { name: true } },
            contacts: true,
            entries: {
                include: {
                    teacher: { select: { id: true, name: true } },
                    subject: { select: { name: true } },
                    files: { select: { name: true, url: true } },
                },
                orderBy: { lessonDate: "desc" },
            },
            grades: {
                include: { subject: { select: { name: true } } },
                orderBy: { date: "desc" },
            },
            exams: {
                include: { subject: { select: { name: true } } },
                orderBy: { date: "desc" },
            },
            reportCardGrades: {
                include: { subject: { select: { name: true } } },
                orderBy: { schoolYear: "desc" },
            },
        },
    });

    if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // If anonymizing teachers, build a mapping: teacher id -> number
    let teacherMap: Record<string, number> = {};
    if (anonymizeTeachers) {
        const uniqueTeachers = new Set<string>();
        student.entries.forEach((e) => {
            if (e.teacher?.id) uniqueTeachers.add(e.teacher.id);
        });
        let counter = 1;
        uniqueTeachers.forEach((tId) => {
            teacherMap[tId] = counter++;
        });
    }

    // Transform entries to use teacher numbers if anonymized
    const exportEntries = student.entries.map((entry) => ({
        date: entry.lessonDate,
        subject: entry.subject?.name || null,
        topic: entry.topic,
        notes: entry.notes,
        homework: entry.homework,
        teacher: anonymizeTeachers
            ? `Lehrkraft ${teacherMap[entry.teacher?.id || ""] || "?"}`
            : entry.teacher?.name || null,
        files: entry.files.map((f) => f.name),
    }));

    const exportData = {
        exportDate: new Date().toISOString(),
        anonymizedTeachers: anonymizeTeachers,
        teacherCount: anonymizeTeachers ? Object.keys(teacherMap).length : undefined,
        student: {
            firstName: student.firstName,
            lastName: student.lastName,
            birthDate: student.birthDate,
            school: student.school,
            gradeLevel: student.gradeLevel,
            note: student.note,
            sites: student.sites.map((s) => s.name),
        },
        entries: exportEntries,
        grades: student.grades.map((g) => ({
            value: g.value,
            type: g.type,
            date: g.date,
            subject: g.subject?.name,
        })),
        exams: student.exams.map((ex) => ({
            date: ex.date,
            subject: ex.subject?.name,
            description: ex.description,
        })),
        reportCardGrades: student.reportCardGrades.map((rg) => ({
            value: rg.value,
            subject: rg.subject?.name,
            schoolYear: rg.schoolYear,
            semester: rg.semester,
        })),
    };

    const fileName = `export-${student.firstName}-${student.lastName}-${new Date().toISOString().slice(0, 10)}.json`;

    // Audit Log
    await createAuditLog({
        action: "DATA_EXPORT",
        details: JSON.stringify({ studentId: student.id, anonymizeTeachers }),
        userId: user.id,
        resourceId: student.id
    });

    return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="${fileName}"`,
        },
    });
}
