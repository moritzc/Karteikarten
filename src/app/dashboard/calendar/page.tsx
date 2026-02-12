"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const HOUR_START = 8;
const HOUR_END = 20;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const PX_PER_HOUR = 80;
const COLORS = [
    "hsl(220, 80%, 55%)", "hsl(160, 70%, 42%)", "hsl(30, 85%, 50%)",
    "hsl(280, 60%, 55%)", "hsl(350, 75%, 55%)", "hsl(50, 80%, 45%)",
    "hsl(190, 70%, 45%)", "hsl(120, 50%, 40%)",
];
const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function CalendarContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const preSelectedStudents = searchParams.get("students")?.split(",").filter(Boolean) || [];
    const [sessions, setSessions] = useState<any[]>([]);
    const [exams, setExams] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<string[]>(preSelectedStudents);
    const [filterSite, setFilterSite] = useState("");
    const [filterSubject, setFilterSubject] = useState("");
    const [loading, setLoading] = useState(true);
    const [weekStart, setWeekStart] = useState(() => {
        const today = new Date();
        const dow = (today.getDay() + 6) % 7; // Monday = 0
        const monday = new Date(today);
        monday.setDate(today.getDate() - dow);
        monday.setHours(0, 0, 0, 0);
        return monday;
    });

    useEffect(() => {
        Promise.all([
            fetch("/api/students").then((r) => r.json()),
            fetch("/api/subjects").then((r) => r.json()),
            fetch("/api/sites").then((r) => r.json()),
        ]).then(([s, sub, si]) => {
            setStudents(Array.isArray(s) ? s : []);
            setSubjects(Array.isArray(sub) ? sub : []);
            setSites(Array.isArray(si) ? si : []);
            setLoading(false);
        });
    }, []);

    // Load sessions for the week
    useEffect(() => {
        const from = weekStart.toISOString().slice(0, 10);
        const to = new Date(weekStart.getTime() + 6 * 86400000).toISOString().slice(0, 10);
        let url = `/api/sessions?from=${from}&to=${to}`;
        if (filterSite) url += `&siteId=${filterSite}`;
        fetch(url).then((r) => r.json()).then((data) => {
            setSessions(Array.isArray(data) ? data : []);
        });
    }, [weekStart, filterSite]);

    // Load exams for the week
    useEffect(() => {
        let url = "/api/exams?upcoming=true";
        if (selectedStudents.length > 0) url += `&studentIds=${selectedStudents.join(",")}`;
        if (filterSubject) url += `&subjectId=${filterSubject}`;
        fetch(url).then((r) => r.json()).then((data) => {
            setExams(Array.isArray(data) ? data : []);
        });
    }, [selectedStudents, filterSubject]);

    const toggleStudent = (id: string) => {
        setSelectedStudents((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
    };

    const prevWeek = () => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() - 7);
        setWeekStart(d);
    };
    const nextWeek = () => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + 7);
        setWeekStart(d);
    };
    const goToday = () => {
        const today = new Date();
        const dow = (today.getDay() + 6) % 7;
        const monday = new Date(today);
        monday.setDate(today.getDate() - dow);
        monday.setHours(0, 0, 0, 0);
        setWeekStart(monday);
    };

    // Get sessions for a day
    const getSessionsForDay = (dayIndex: number) => {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + dayIndex);
        return sessions.filter((s) => {
            const d = new Date(s.date);
            return d.getDate() === dayDate.getDate() && d.getMonth() === dayDate.getMonth() && d.getFullYear() === dayDate.getFullYear();
        });
    };

    // Get exams for a day
    const getExamsForDay = (dayIndex: number) => {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + dayIndex);
        return exams.filter((e) => {
            const d = new Date(e.date);
            return d.getDate() === dayDate.getDate() && d.getMonth() === dayDate.getMonth() && d.getFullYear() === dayDate.getFullYear();
        });
    };

    const isToday = (dayIndex: number) => {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + dayIndex);
        const now = new Date();
        return dayDate.getDate() === now.getDate() && dayDate.getMonth() === now.getMonth() && dayDate.getFullYear() === now.getFullYear();
    };

    // Compute top/height from time
    const timeToPixels = (timeStr: string) => {
        const [h, m] = timeStr.split(":").map(Number);
        return ((h - HOUR_START) + m / 60) * PX_PER_HOUR;
    };

    // Detect overlapping sessions in a column and assign sub-columns
    const layoutSessions = (daySessions: any[]) => {
        const items = daySessions.map((s) => {
            const [h, m] = (s.startTime || "14:30").split(":").map(Number);
            const startMin = h * 60 + m;
            const endMin = startMin + (s.duration || 90);
            return { ...s, startMin, endMin };
        }).sort((a, b) => a.startMin - b.startMin);

        const columns: any[][] = [];
        for (const item of items) {
            let placed = false;
            for (const col of columns) {
                const last = col[col.length - 1];
                if (item.startMin >= last.endMin) {
                    col.push(item);
                    placed = true;
                    break;
                }
            }
            if (!placed) columns.push([item]);
        }
        // Assign column index & total
        const result: any[] = [];
        for (let ci = 0; ci < columns.length; ci++) {
            for (const item of columns[ci]) {
                result.push({ ...item, colIndex: ci, totalCols: columns.length });
            }
        }
        return result;
    };

    const weekEndDate = new Date(weekStart);
    weekEndDate.setDate(weekStart.getDate() + 6);
    const monthNames = ["Jän", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

    // Expanded detail
    const [selectedSession, setSelectedSession] = useState<any>(null);

    if (loading) return <div className="loading-center"><div className="spinner"></div></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">📅 Wochenkalender</h1>
                <div className="flex gap-2 items-center">
                    <button className="btn btn-ghost btn-sm" onClick={prevWeek}>← Woche</button>
                    <button className="btn btn-outline btn-sm" onClick={goToday}>Heute</button>
                    <button className="btn btn-ghost btn-sm" onClick={nextWeek}>Woche →</button>
                </div>
            </div>

            <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">
                    {weekStart.getDate()}. {monthNames[weekStart.getMonth()]} – {weekEndDate.getDate()}. {monthNames[weekEndDate.getMonth()]} {weekEndDate.getFullYear()}
                </h2>
            </div>

            {/* Filters */}
            <div className="filter-bar">
                <div className="form-group">
                    <label className="form-label">Standort</label>
                    <select className="select" value={filterSite} onChange={(e) => setFilterSite(e.target.value)}>
                        <option value="">Alle Standorte</option>
                        {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="form-group" style={{ minWidth: "180px" }}>
                    <label className="form-label">Schüler</label>
                    <select className="select" onChange={(e) => { if (e.target.value) toggleStudent(e.target.value); e.target.value = ""; }}>
                        <option value="">Schüler filtern...</option>
                        {students.filter((s) => !selectedStudents.includes(s.id)).map((s) => (
                            <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedStudents.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {selectedStudents.map((id) => {
                        const s = students.find((st) => st.id === id);
                        return s ? (
                            <span key={id} className="chip chip-removable" onClick={() => toggleStudent(id)}>
                                {s.firstName} {s.lastName} ✕
                            </span>
                        ) : null;
                    })}
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedStudents([])}>Alle entfernen</button>
                </div>
            )}

            {/* Weekly calendar grid */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", borderBottom: "1px solid hsl(var(--border))" }}>
                    <div style={{ padding: "0.5rem", borderRight: "1px solid hsl(var(--border))", background: "hsl(var(--secondary))" }} />
                    {DAY_LABELS.map((label, i) => {
                        const dayDate = new Date(weekStart);
                        dayDate.setDate(weekStart.getDate() + i);
                        return (
                            <div
                                key={i}
                                style={{
                                    padding: "0.5rem",
                                    textAlign: "center",
                                    borderRight: i < 6 ? "1px solid hsl(var(--border))" : undefined,
                                    background: isToday(i) ? "hsl(var(--primary) / 0.1)" : "hsl(var(--secondary))",
                                    fontWeight: isToday(i) ? 700 : 600,
                                    fontSize: "0.8rem",
                                }}
                            >
                                <div>{label}</div>
                                <div style={{ fontSize: "1rem", fontWeight: 700, color: isToday(i) ? "hsl(var(--primary))" : undefined }}>
                                    {dayDate.getDate()}
                                </div>
                                {/* Exam indicators */}
                                {getExamsForDay(i).length > 0 && (
                                    <div className="flex gap-1 justify-center mt-1">
                                        {getExamsForDay(i).map((ex: any) => (
                                            <span key={ex.id} title={`${ex.subject?.name}: ${ex.student?.firstName} ${ex.student?.lastName}`} style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "hsl(var(--warning))", display: "inline-block" }} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Time grid */}
                <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", position: "relative", height: `${TOTAL_HOURS * PX_PER_HOUR}px` }}>
                    {/* Hour labels */}
                    <div style={{ position: "relative", borderRight: "1px solid hsl(var(--border))" }}>
                        {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                            <div key={i} style={{ position: "absolute", top: `${i * PX_PER_HOUR}px`, width: "100%", height: `${PX_PER_HOUR}px`, borderTop: i > 0 ? "1px solid hsl(var(--border) / 0.3)" : undefined, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "2px", fontSize: "0.7rem", color: "hsl(var(--muted-foreground))" }}>
                                {HOUR_START + i}:00
                            </div>
                        ))}
                    </div>

                    {/* Day columns */}
                    {Array.from({ length: 7 }, (_, dayIndex) => {
                        const daySessions = getSessionsForDay(dayIndex);
                        const layouted = layoutSessions(daySessions);

                        return (
                            <div key={dayIndex} style={{ position: "relative", borderRight: dayIndex < 6 ? "1px solid hsl(var(--border) / 0.3)" : undefined, background: isToday(dayIndex) ? "hsl(var(--primary) / 0.03)" : undefined }}>
                                {/* Hour lines */}
                                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                                    <div key={i} style={{ position: "absolute", top: `${i * PX_PER_HOUR}px`, width: "100%", borderTop: i > 0 ? "1px solid hsl(var(--border) / 0.15)" : undefined }} />
                                ))}

                                {/* Session blocks */}
                                {layouted.map((s) => {
                                    const top = timeToPixels(s.startTime || "14:30");
                                    const height = (s.duration || 90) / 60 * PX_PER_HOUR;
                                    const colWidth = 100 / s.totalCols;
                                    const left = s.colIndex * colWidth;
                                    const colorIdx = daySessions.indexOf(daySessions.find((ds: any) => ds.id === s.id)) % COLORS.length;

                                    return (
                                        <div
                                            key={s.id}
                                            className="week-session-block"
                                            style={{
                                                position: "absolute",
                                                top: `${top}px`,
                                                left: `${left}%`,
                                                width: `${colWidth}%`,
                                                height: `${Math.max(height, 20)}px`,
                                                backgroundColor: COLORS[colorIdx] + "20",
                                                borderLeft: `3px solid ${COLORS[colorIdx]}`,
                                                borderRadius: "4px",
                                                padding: "2px 4px",
                                                overflow: "hidden",
                                                cursor: "pointer",
                                                fontSize: "0.7rem",
                                                lineHeight: "1.2",
                                                zIndex: 2,
                                                transition: "transform 0.1s ease, box-shadow 0.1s ease",
                                            }}
                                            onClick={() => setSelectedSession(selectedSession?.id === s.id ? null : s)}
                                            onDoubleClick={() => router.push(`/dashboard/my-sessions/${s.id}`)}
                                            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.zIndex = "10"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.zIndex = "2"; e.currentTarget.style.boxShadow = "none"; }}
                                            title={`${s.startTime}–${s.duration}min | ${s.subjects?.map((sub: any) => sub.name).join(", ") || "Kein Fach"} | ${s.teacher?.name || "Keine Lehrkraft"} | ${s.room?.name || ""}`}
                                        >
                                            <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {s.subjects?.map((sub: any) => sub.name).join(", ") || "Gruppe"}
                                            </div>
                                            {height > 30 && <div style={{ opacity: 0.7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.teacher?.name || ""}</div>}
                                            {height > 50 && s.room && <div style={{ opacity: 0.5 }}>🚪 {s.room.name}</div>}
                                            {height > 60 && <div style={{ opacity: 0.6 }}>{s.students?.length || 0} Schüler</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Detail popup for selected session */}
            {selectedSession && (
                <div className="card mt-4 animate-fade-in" style={{ borderLeft: "4px solid hsl(var(--primary))" }}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">
                            {selectedSession.subjects?.map((s: any) => s.name).join(", ") || "Gruppe"} — {new Date(selectedSession.date).toLocaleDateString("de-AT")}
                        </h3>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedSession(null)}>✕</button>
                    </div>
                    <div className="grid grid-3" style={{ fontSize: "0.875rem" }}>
                        <div>
                            <strong>🕐 Zeit:</strong> {selectedSession.startTime} – {(() => {
                                const [h, m] = (selectedSession.startTime || "14:30").split(":").map(Number);
                                const end = h * 60 + m + (selectedSession.duration || 90);
                                return `${Math.floor(end / 60).toString().padStart(2, "0")}:${(end % 60).toString().padStart(2, "0")}`;
                            })()} ({selectedSession.duration} Min.)
                        </div>
                        <div><strong>👨‍🏫 Lehrkraft:</strong> {selectedSession.teacher?.name || "Nicht zugewiesen"}</div>
                        <div><strong>🚪 Raum:</strong> {selectedSession.room?.name || "Kein Raum"}</div>
                    </div>
                    <div className="mt-3">
                        <strong>🎓 Schüler ({selectedSession.students?.length || 0}):</strong>{" "}
                        {selectedSession.students?.map((st: any) => `${st.firstName} ${st.lastName}`).join(", ") || "Keine"}
                    </div>
                    {selectedSession.managerNote && (
                        <div className="post-it mt-3" style={{ transform: "none" }}>{selectedSession.managerNote}</div>
                    )}
                    {selectedSession.site && (
                        <div className="mt-2"><span className="badge badge-muted">📍 {selectedSession.site.name}</span></div>
                    )}
                    <div className="mt-4 flex gap-2">
                        <button className="btn btn-primary btn-sm" onClick={() => router.push(`/dashboard/my-sessions/${selectedSession.id}`)}>📋 Zur Gruppenansicht</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedSession(null)}>Schließen</button>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                    <span style={{ width: "12px", height: "12px", backgroundColor: COLORS[0] + "40", borderLeft: `3px solid ${COLORS[0]}`, borderRadius: "2px", display: "inline-block" }} />
                    Gruppen/Sessions
                </div>
                <div className="flex items-center gap-1">
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "hsl(var(--warning))", display: "inline-block" }} />
                    Schularbeiten (im Kopfbereich)
                </div>
            </div>
        </div>
    );
}

export default function CalendarPage() {
    return (
        <Suspense fallback={<div className="loading-center"><div className="spinner"></div></div>}>
            <CalendarContent />
        </Suspense>
    );
}
