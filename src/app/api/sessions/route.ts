import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrFail, getUserFromSession, startOfDay, endOfDay } from "@/lib/helpers";

// GET /api/sessions?siteId=xxx&date=yyyy-mm-dd&teacherId=xxx&from=yyyy-mm-dd&to=yyyy-mm-dd
export async function GET(req: NextRequest) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");
    const dateStr = searchParams.get("date");
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const teacherId = searchParams.get("teacherId");

    const where: any = {};

    if (siteId) where.siteId = siteId;
    if (teacherId) where.teacherId = teacherId;

    if (dateStr) {
        const d = new Date(dateStr);
        where.date = { gte: startOfDay(d), lte: endOfDay(d) };
    } else if (fromStr && toStr) {
        where.date = { gte: startOfDay(new Date(fromStr)), lte: endOfDay(new Date(toStr)) };
    }

    // Teachers only see their own sessions
    if (user.role === "TEACHER") {
        where.teacherId = user.id;
    }
    // SITE_MANAGER see sessions at their sites
    if (user.role === "SITE_MANAGER") {
        if (!siteId) {
            const userSites = await prisma.site.findMany({
                where: { users: { some: { id: user.id } } },
                select: { id: true },
            });
            where.siteId = { in: userSites.map((s) => s.id) };
        }
    }

    const completedStr = searchParams.get("completed");
    if (completedStr === "true") where.completed = true;
    if (completedStr === "false") where.completed = false;

    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const sort = searchParams.get("sort") || "asc"; // "asc" or "desc"

    const orderBy: any[] = sort === "desc"
        ? [{ date: "desc" }, { startTime: "desc" }]
        : [{ startTime: "asc" }, { date: "asc" }];

    const sessions = await prisma.session.findMany({
        where,
        take: limit,
        include: {
            site: { select: { id: true, name: true } },
            teacher: { select: { id: true, name: true } },
            subjects: true,
            room: { select: { id: true, name: true } },
            students: {
                include: {
                    entries: {
                        orderBy: { lessonDate: "desc" },
                        take: 1,
                        include: { subject: true },
                    },
                    grades: {
                        orderBy: { date: "desc" },
                        take: 3,
                        include: { subject: true },
                    },
                    exams: {
                        where: { date: { gte: new Date() } },
                        orderBy: { date: "asc" },
                        take: 3,
                        include: { subject: true },
                    },
                },
            },
        },
        orderBy,
    });

    return NextResponse.json(sessions);
}

// POST /api/sessions — create session(s) (ADMIN or SITE_MANAGER)
export async function POST(req: NextRequest) {
    const { error, session } = await getSessionOrFail();
    if (error) return error;
    const user = getUserFromSession(session);

    if (user.role === "TEACHER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
        date,
        siteId,
        teacherId,
        subjectIds,  // array of subject IDs (multi-select)
        studentIds,
        managerNote,
        startTime,
        duration,
        recurring,
        weeksToCreate,
        roomId,
    } = body;

    const baseData = {
        siteId,
        teacherId: teacherId || null,
        managerNote: managerNote || null,
        startTime: startTime || "14:30",
        duration: duration || 90,
        roomId: roomId || null,
        students: studentIds?.length ? { connect: studentIds.map((id: string) => ({ id })) } : undefined,
        subjects: subjectIds?.length ? { connect: subjectIds.map((id: string) => ({ id })) } : undefined,
    };

    if (recurring && weeksToCreate && weeksToCreate > 1) {
        // Create recurring sessions for multiple weeks (up to 52 = 1 year)
        const maxWeeks = Math.min(weeksToCreate, 52);
        const recurringGroupId = crypto.randomUUID();
        const baseDate = new Date(date);
        const dayOfWeek = (baseDate.getDay() + 6) % 7;

        // Load holidays for this site to skip sessions during holidays
        let holidays: { startDate: Date; endDate: Date; name: string }[] = [];
        if (siteId) {
            const site = await prisma.site.findUnique({
                where: { id: siteId },
                include: { holidaySet: { include: { holidays: true } } },
            });
            if (site?.holidaySet?.holidays) {
                holidays = site.holidaySet.holidays.map((h) => ({
                    startDate: new Date(h.startDate),
                    endDate: new Date(h.endDate),
                    name: h.name,
                }));
            }
        }

        const createdSessions = [];
        const skippedDates: { date: string; reason: string }[] = [];

        for (let w = 0; w < maxWeeks; w++) {
            const sessionDate = new Date(baseDate);
            sessionDate.setDate(sessionDate.getDate() + w * 7);

            // Check if this date falls in a holiday period
            const isHoliday = holidays.find(
                (h) => sessionDate >= h.startDate && sessionDate <= h.endDate
            );
            if (isHoliday) {
                skippedDates.push({
                    date: sessionDate.toISOString().slice(0, 10),
                    reason: isHoliday.name,
                });
                continue; // Skip this week
            }

            const newSession = await prisma.session.create({
                data: {
                    ...baseData,
                    date: sessionDate,
                    recurring: true,
                    dayOfWeek,
                    recurringGroupId,
                    students: studentIds?.length ? { connect: studentIds.map((id: string) => ({ id })) } : undefined,
                    subjects: subjectIds?.length ? { connect: subjectIds.map((id: string) => ({ id })) } : undefined,
                },
                include: {
                    site: { select: { id: true, name: true } },
                    teacher: { select: { id: true, name: true } },
                    subjects: true,
                    room: true,
                    students: true,
                },
            });
            createdSessions.push(newSession);
        }
        return NextResponse.json({ sessions: createdSessions, skippedDates }, { status: 201 });
    } else {
        // Single session
        const newSession = await prisma.session.create({
            data: {
                ...baseData,
                date: new Date(date),
                recurring: false,
            },
            include: {
                site: { select: { id: true, name: true } },
                teacher: { select: { id: true, name: true } },
                subjects: true,
                room: true,
                students: true,
            },
        });
        return NextResponse.json(newSession, { status: 201 });
    }
}
