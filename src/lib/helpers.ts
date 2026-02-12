import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";

export async function getSessionOrFail() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
    }
    return { error: null, session };
}

export function getUserFromSession(session: any) {
    return {
        id: session.user.id as string,
        role: session.user.role as string,
        name: session.user.name as string,
        email: session.user.email as string,
    };
}

export function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString("de-AT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

export function startOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function endOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}
