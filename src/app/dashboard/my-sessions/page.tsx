"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/helpers";

export default function MySessionsPage() {
    const router = useRouter();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    const dateStr = currentDate.toISOString().slice(0, 10);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/sessions?date=${dateStr}`)
            .then((r) => r.json())
            .then((data) => {
                setSessions(Array.isArray(data) ? data : []);
                setLoading(false);
            });
    }, [dateStr]);

    const goDay = (offset: number) => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + offset);
        setCurrentDate(d);
    };

    const goToday = () => setCurrentDate(new Date());

    const isToday = currentDate.toDateString() === new Date().toDateString();

    // Quick day buttons for the current week
    const weekDays: Date[] = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7)); // Monday
    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        weekDays.push(d);
    }

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">📋 Meine Gruppen</h1>
            </div>

            {/* Day navigation */}
            <div className="card mb-6">
                <div className="flex items-center justify-between mb-4">
                    <button className="btn btn-ghost" onClick={() => goDay(-1)}>← Vorheriger Tag</button>
                    <div className="text-center">
                        <h2 className="text-lg font-semibold">{formatDate(currentDate, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</h2>
                        <span className="badge badge-primary">{sessions.length} Gruppen</span>
                    </div>
                    <button className="btn btn-ghost" onClick={() => goDay(1)}>Nächster Tag →</button>
                </div>

                {/* Week quick selector */}
                <div className="flex gap-1 justify-center flex-wrap">
                    {weekDays.map((d, i) => {
                        const isSelected = d.toDateString() === currentDate.toDateString();
                        const isTodayDay = d.toDateString() === new Date().toDateString();
                        return (
                            <button
                                key={i}
                                className={`btn ${isSelected ? "btn-primary" : isTodayDay ? "btn-outline" : "btn-ghost"}`}
                                style={{ minWidth: "70px", padding: "0.25rem 0.5rem" }}
                                onClick={() => setCurrentDate(new Date(d))}
                            >
                                <div style={{ fontSize: "0.7rem" }}>{formatDate(d, { weekday: "short" })}</div>
                                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{d.getDate()}</div>
                            </button>
                        );
                    })}
                </div>

                {/* Quick jump */}
                <div className="flex gap-2 mt-3 justify-center items-center">
                    {!isToday && <button className="btn btn-outline btn-sm" onClick={goToday}>📌 Heute</button>}
                    <button className="btn btn-ghost btn-sm" onClick={() => goDay(-7)}>← Woche</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => goDay(7)}>Woche →</button>
                    <input
                        className="input"
                        type="date"
                        value={dateStr}
                        onChange={(e) => setCurrentDate(new Date(e.target.value))}
                        style={{ maxWidth: "160px", fontSize: "0.85rem" }}
                    />
                </div>
            </div>

            {loading ? (
                <div className="loading-center"><div className="spinner"></div></div>
            ) : sessions.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">📭</div>
                        <p>Keine Gruppen für diesen Tag.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-2">
                    {sessions.map((s) => (
                        <div
                            key={s.id}
                            className="card card-clickable animate-slide-up"
                            onClick={() => router.push(`/dashboard/my-sessions/${s.id}`)}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    {s.subjects?.map((sub: any) => <span key={sub.id} className="badge badge-primary">{sub.name}</span>)}
                                    <span className={`badge ${s.completed ? "badge-success" : "badge-warning"}`}>
                                        {s.completed ? "Abgeschlossen" : "Offen"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">{s.startTime} — {s.duration}min</span>
                                    <span className="text-xs text-muted-foreground">{s.site?.name}</span>
                                </div>
                            </div>

                            {s.room?.name && <div className="text-xs text-muted-foreground mb-2">🚪 {s.room.name}</div>}
                            {s.managerNote && <div className="post-it mb-3">{s.managerNote}</div>}

                            <div className="flex flex-col gap-2">
                                {s.students?.map((student: any) => {
                                    const lastEntry = student.entries?.[0];
                                    const upcomingExams = student.exams || [];

                                    return (
                                        <div key={student.id} className="info-bar">
                                            <strong>{student.firstName} {student.lastName}</strong>
                                            {lastEntry && (
                                                <span>
                                                    | Zuletzt: {lastEntry.subject?.name} — {lastEntry.topic || "—"}
                                                </span>
                                            )}
                                            {upcomingExams.length > 0 && (
                                                <span className="badge badge-warning" style={{ marginLeft: "auto" }}>
                                                    SA: {upcomingExams[0].subject?.name}{" "}
                                                    {formatDate(upcomingExams[0].date)}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
