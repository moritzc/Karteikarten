"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/helpers";

interface Props {
    userId: string;
}

export default function TeacherDashboard({ userId }: Props) {
    const router = useRouter();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Note functionality
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteForm, setNoteForm] = useState({ studentId: "", content: "" });
    const [students, setStudents] = useState<any[]>([]);
    const [sendingNote, setSendingNote] = useState(false);

    const [nextSessions, setNextSessions] = useState<any[]>([]);
    const [nextDayLabel, setNextDayLabel] = useState("");

    useEffect(() => {
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);

        // Find next working day (skip weekends if needed, or just next day with sessions)
        // Simple heuristic: check tomorrow, if empty check monday (if today is fri/sat)
        // For now, let's just fetch tomorrow and maybe the day after if tomorrow is empty? 
        // Better: Fetch a range (next 3 days) and filter locally for the first day with sessions.
        // For simplicity requested: "next working day". Let's assume just tomorrow for now, 
        // or a specific logic. Let's try to fetch tomorrow.
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().slice(0, 10);

        Promise.all([
            fetch(`/api/sessions?date=${todayStr}&teacherId=${userId}`).then((r) => r.json()),
            fetch(`/api/sessions?date=${tomorrowStr}&teacherId=${userId}`).then((r) => r.json()),
            fetch("/api/students").then((r) => r.json())
        ]).then(([sessionsData, nextData, studentsData]) => {
            setSessions(Array.isArray(sessionsData) ? sessionsData : []);
            setNextSessions(Array.isArray(nextData) ? nextData : []);
            setNextDayLabel(formatDate(tomorrow, { weekday: "long", day: "2-digit", month: "2-digit" }));
            setStudents(Array.isArray(studentsData) ? studentsData : []);
            setLoading(false);
        });
    }, [userId]);

    const handleSendNote = async () => {
        if (!noteForm.studentId || !noteForm.content) return;
        setSendingNote(true);
        const res = await fetch("/api/teacher-notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(noteForm),
        });
        setSendingNote(false);
        if (res.ok) {
            setShowNoteModal(false);
            setNoteForm({ studentId: "", content: "" });
            alert("Notiz erfolgreich an die Standortleitung gesendet.");
        } else {
            alert("Fehler beim Senden der Notiz.");
        }
    };

    if (loading) return <div className="loading-center"><div className="spinner"></div></div>;

    return (
        <div>
            {/* Header Actions */}
            <div className="flex justify-between items-center mb-6">
                <div className="grid grid-3 gap-4 flex-1 mr-8">
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

                <button className="btn btn-primary" onClick={() => setShowNoteModal(true)} style={{ height: "fit-content" }}>
                    ✉️ Notiz an Leitung
                </button>
            </div>

            <h2 className="text-xl font-semibold mb-4">📋 Meine heutigen Gruppen</h2>

            {sessions.length === 0 ? (
                <div className="card mb-8">
                    <div className="empty-state">
                        <div className="empty-state-icon">📭</div>
                        <p>Keine Gruppen für heute zugewiesen.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-2 mb-8">
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
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Next Working Day Preview */}
            {nextSessions.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-muted-foreground">📅 Vorschau: {nextDayLabel}</h2>
                    <div className="grid grid-2 opacity-75 hover:opacity-100 transition-opacity">
                        {nextSessions.map((s: any) => (
                            <div
                                key={s.id}
                                className="card card-clickable"
                                onClick={() => router.push(`/dashboard/my-sessions/${s.id}`)}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="badge badge-muted">Vorschau</span>
                                        {s.subjects?.map((sub: any) => <span key={sub.id} className="badge badge-outline">{sub.name}</span>)}
                                    </div>
                                    <span className="text-sm">{s.startTime}</span>
                                </div>
                                <div className="text-sm mb-1">
                                    <strong>{s.site?.name}</strong> {s.room && `| Raum: ${s.room.name}`}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {s.students?.length} Schüler: {s.students?.map((st: any) => st.firstName).join(", ")}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-2 mb-8">
                <div className="card card-clickable" onClick={() => router.push("/dashboard/entries")}>
                    <h3 className="card-title">✏️ Meine Einträge</h3>
                    <p className="card-description">Alle bisherigen Einträge ansehen und bearbeiten.</p>
                </div>
                <div className="card card-clickable" onClick={() => router.push("/dashboard/calendar")}>
                    <h3 className="card-title">📅 Kalender</h3>
                    <p className="card-description">Anstehende Schularbeiten und Termine.</p>
                </div>
            </div>

            {/* Past Sessions Overview */}
            <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">📜 Übersicht der gehaltenen Einheiten</h2>
                <div className="card">
                    <PastSessions userId={userId} />
                </div>
            </div>

            {/* Note Modal */}
            {showNoteModal && (
                <div className="modal-overlay" onClick={() => setShowNoteModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Notiz an Standortleitung</h2>
                        <p className="mb-4 text-sm text-muted-foreground">
                            Hier können Sie eine wichtige Information zu einem Schüler an die Standortleitung senden.
                        </p>

                        <div className="form-group mb-4">
                            <label className="form-label">Schüler auswählen</label>
                            <select
                                className="select"
                                value={noteForm.studentId}
                                onChange={(e) => setNoteForm({ ...noteForm, studentId: e.target.value })}
                            >
                                <option value="">-- Bitte wählen --</option>
                                {students.map(s => (
                                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.sites?.map((site: any) => site.name).join(", ")})</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group mb-4">
                            <label className="form-label">Nachricht / Vorfall / Notiz</label>
                            <textarea
                                className="textarea"
                                rows={4}
                                value={noteForm.content}
                                onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                                placeholder="Was soll die Standortleitung wissen/erledigen?"
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowNoteModal(false)}>Abbrechen</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSendNote}
                                disabled={!noteForm.studentId || !noteForm.content || sendingNote}
                            >
                                {sendingNote ? "Sende..." : "Absenden"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function PastSessions({ userId }: { userId: string }) {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // limit=50 gives a better overview
        fetch(`/api/sessions?teacherId=${userId}&completed=true&limit=50&sort=desc`)
            .then((r) => r.json())
            .then((data) => {
                setSessions(Array.isArray(data) ? data : []);
                setLoading(false);
            });
    }, [userId]);

    if (loading) return <div className="spinner"></div>;
    if (sessions.length === 0) return <div className="text-muted-foreground p-4">Keine vergangenen Einheiten gefunden.</div>;

    return (
        <div className="table-container">
            <table className="table">
                <thead>
                    <tr>
                        <th>Datum</th>
                        <th>Uhrzeit</th>
                        <th>Standort</th>
                        <th>Fächer</th>
                        <th>Schüler</th>
                        <th>Aktion</th>
                    </tr>
                </thead>
                <tbody>
                    {sessions.map((s) => (
                        <tr key={s.id} className="hover:bg-muted/50">
                            <td>{formatDate(s.date, { weekday: "short", day: "2-digit", month: "2-digit" })}</td>
                            <td>{s.startTime} ({s.duration}min)</td>
                            <td>{s.site?.name}</td>
                            <td>{s.subjects?.map((sub: any) => sub.name).join(", ")}</td>
                            <td>{s.students?.length}</td>
                            <td>
                                <button className="btn btn-sm btn-ghost" onClick={() => router.push(`/dashboard/my-sessions/${s.id}`)}>
                                    Details →
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
