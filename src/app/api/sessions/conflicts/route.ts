import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail } from "@/lib/helpers";

// GET /api/sessions/conflicts?teacherId=xxx&date=yyyy-mm-dd&startTime=HH:MM&duration=90&excludeId=xxx
// Check if teacher has a scheduling conflict
export async function GET(req: NextRequest) {
    const { error } = await getSessionOrFail();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacherId");
    const date = searchParams.get("date");
    const startTime = searchParams.get("startTime");
    const duration = parseInt(searchParams.get("duration") || "90", 10);
    const excludeId = searchParams.get("excludeId"); // For editing existing sessions

    if (!teacherId || !date || !startTime) {
        return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Find all sessions for this teacher on this date
    const where: any = {
        teacherId,
        date: { gte: startOfDay, lte: endOfDay },
    };
    if (excludeId) where.id = { not: excludeId };

    const existingSessions = await prisma.session.findMany({
        where,
        include: {
            site: { select: { name: true } },
            subjects: { select: { name: true } },
        },
    });

    // Check for time overlap
    const [newStartH, newStartM] = startTime.split(":").map(Number);
    const newStartMin = newStartH * 60 + newStartM;
    const newEndMin = newStartMin + duration;

    const conflicts = existingSessions.filter((s) => {
        const [h, m] = s.startTime.split(":").map(Number);
        const sStart = h * 60 + m;
        const sEnd = sStart + s.duration;
        return newStartMin < sEnd && newEndMin > sStart; // Overlapping
    });

    if (conflicts.length > 0) {
        const conflictInfo = conflicts.map((c) => ({
            id: c.id,
            site: c.site?.name,
            startTime: c.startTime,
            duration: c.duration,
            subjects: c.subjects?.map((s) => s.name).join(", "),
        }));

        return NextResponse.json({
            hasConflict: true,
            conflicts: conflictInfo,
            message: `Die Lehrkraft ist zu diesem Zeitpunkt bereits im Standort ${conflictInfo[0].site} gebucht (${conflictInfo[0].startTime}, ${conflictInfo[0].subjects || "Gruppe"}). Bitte erst nach Absprache mit der Standortleitung buchen!`,
        });
    }

    return NextResponse.json({ hasConflict: false, conflicts: [] });
}
