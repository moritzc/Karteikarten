"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
    userId: string;
}

export default function TeacherDashboard({ userId }: Props) {
    const router = useRouter();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const today = new Date().toISOString().slice(0, 10);
        fetch(`/api/sessions?date=${today}&teacherId=${userId}`)
            .then((r) => r.json())
            .then((data) => {
                setSessions(Array.isArray(data) ? data : []);
                setLoading(false);
            });
    }, [userId]);

    if (loading) return <div className="loading-center"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="grid grid-3 mb-8">
                <div className="stat-card">
                    <div className="stat-value">{sessions.length}</div>
                    <div className="stat-label">Heutige Gruppen</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">
                        {sessions.reduce((acc: number, s: any) => acc + (s.students?.length || 0), 0)}
                    </div>
                    <div className="stat-label">Schüler heute</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{sessions.filter((s: any) => !s.completed).length}</div>
                    <div className="stat-label">Ausstehend</div>
                </div>
            </div>

            <h2 className="text-xl font-semibold mb-4">📋 Meine heutigen Gruppen</h2>

            {sessions.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">📭</div>
                        <p>Keine Gruppen für heute zugewiesen.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-2 mb-6">
                    {sessions.map((s: any) => (
                        <div
                            key={s.id}
                            className="card card-clickable animate-slide-up"
                            onClick={() => router.push(`/dashboard/my-sessions/${s.id}`)}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    {s.subjects?.map((sub: any) => <span key={sub.id} className="badge badge-primary">{sub.name}</span>)}
                                    <span className={`badge ${s.completed ? "badge-success" : "badge-warning"}`}>
                                        {s.completed ? "✓" : "Offen"}
                                    </span>
                                </div>
                                <span className="text-xs text-muted-foreground">{s.site?.name}</span>
                            </div>

                            {s.managerNote && <div className="post-it mb-3">{s.managerNote}</div>}

                            <div className="flex flex-col gap-2">
                                {s.students?.map((student: any) => {
                                    const lastEntry = student.entries?.[0];
                                    const upcomingExams = student.exams || [];
                                    const recentGrades = student.grades || [];
                                    const badGrade = recentGrades.find((g: any) => g.value >= 4);

                                    return (
                                        <div key={student.id} className={`info-bar ${badGrade && upcomingExams.length > 0 ? "urgency-high" : ""}`}>
                                            <strong>{student.firstName} {student.lastName}</strong>
                                            {lastEntry && (
                                                <span>
                                                    | Letztes Mal: {lastEntry.subject?.name} — {lastEntry.topic || "Kein Thema"}
                                                </span>
                                            )}
                                            {upcomingExams.length > 0 && (
                                                <span className="badge badge-warning" style={{ marginLeft: "auto" }}>
                                                    SA: {upcomingExams[0].subject?.name} am{" "}
                                                    {new Date(upcomingExams[0].date).toLocaleDateString("de-AT")}
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

            <div className="grid grid-2">
                <div className="card card-clickable" onClick={() => router.push("/dashboard/entries")}>
                    <h3 className="card-title">✏️ Meine Einträge</h3>
                    <p className="card-description">Alle bisherigen Einträge ansehen und bearbeiten.</p>
                </div>
                <div className="card card-clickable" onClick={() => router.push("/dashboard/calendar")}>
                    <h3 className="card-title">📅 Kalender</h3>
                    <p className="card-description">Anstehende Schularbeiten und Termine.</p>
                </div>
            </div>

            {/* Past Sessions */}
            <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">📜 Letzte gehaltene Einheiten</h2>
                <PastSessions userId={userId} />
            </div>
        </div>
    );
}

function PastSessions({ userId }: { userId: string }) {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetch(`/api/sessions?teacherId=${userId}&completed=true&limit=5&sort=desc`)
            .then((r) => r.json())
            .then((data) => {
                setSessions(Array.isArray(data) ? data : []);
                setLoading(false);
            });
    }, [userId]);

    if (loading) return <div className="spinner"></div>;
    if (sessions.length === 0) return <div className="text-muted-foreground">Keine vergangenen Einheiten gefunden.</div>;

    return (
        <div className="flex flex-col gap-2">
            {sessions.map((s) => (
                <div key={s.id} className="card card-hover card-clickable flex items-center justify-between p-3" onClick={() => router.push(`/dashboard/my-sessions/${s.id}`)}>
                    <div>
                        <div className="font-semibold">{new Date(s.date).toLocaleDateString("de-AT")} — {s.subjects?.map((sub: any) => sub.name).join(", ")}</div>
                        <div className="text-sm text-muted-foreground">{s.site?.name} • {s.students?.length || 0} Schüler</div>
                    </div>
                    <span className="badge badge-success">Abgeschlossen</span>
                </div>
            ))}
        </div>
    );
}
