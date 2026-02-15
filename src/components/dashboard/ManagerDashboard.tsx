"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
    userId: string;
}

export default function ManagerDashboard({ userId }: Props) {
    const router = useRouter();
    const [sites, setSites] = useState<any[]>([]);
    const [todaySessions, setTodaySessions] = useState<any[]>([]);
    const [tomorrowSessions, setTomorrowSessions] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingSession, setEditingSession] = useState<any>(null);
    const [editForm, setEditForm] = useState({
        date: "",
        teacherId: "",
        subjectIds: [] as string[],
        studentIds: [] as string[],
        managerNote: "",
        startTime: "14:30",
        duration: 90,
        roomId: "",
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().slice(0, 10);

        Promise.all([
            fetch("/api/sites").then((r) => r.json()),
            fetch(`/api/sessions?date=${todayStr}`).then((r) => r.json()),
            fetch(`/api/sessions?date=${tomorrowStr}`).then((r) => r.json()),
            fetch("/api/users?role=TEACHER").then((r) => r.json()),
            fetch("/api/subjects").then((r) => r.json()),
            fetch("/api/students").then((r) => r.json()),
            fetch("/api/rooms").then((r) => r.json()),
            fetch("/api/teacher-notes?isDone=false").then((r) => r.json()),
        ]).then(([sitesData, todayData, tomorrowData, teacherData, subjectData, studentData, roomData, notesData]) => {
            setSites(Array.isArray(sitesData) ? sitesData : []);
            setTodaySessions(Array.isArray(todayData) ? todayData : []);
            setTomorrowSessions(Array.isArray(tomorrowData) ? tomorrowData : []);
            setTeachers(Array.isArray(teacherData) ? teacherData : []);
            setSubjects(Array.isArray(subjectData) ? subjectData : []);
            setStudents(Array.isArray(studentData) ? studentData : []);
            setRooms(Array.isArray(roomData) ? roomData : []);
            setNotes(Array.isArray(notesData) ? notesData : []);
            setLoading(false);
        });
    }, []);

    const markNoteDone = async (id: string) => {
        const res = await fetch(`/api/teacher-notes/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isDone: true }),
        });
        if (res.ok) {
            setNotes((prev) => prev.filter((n) => n.id !== id));
        }
    };

    const openEditModal = (session: any) => {
        setEditingSession(session);
        setEditForm({
            date: session.date ? new Date(session.date).toISOString().slice(0, 10) : "",
            teacherId: session.teacherId || "",
            subjectIds: session.subjects?.map((s: any) => s.id) || [],
            studentIds: session.students?.map((s: any) => s.id) || [],
            managerNote: session.managerNote || "",
            startTime: session.startTime || "14:30",
            duration: session.duration || 90,
            roomId: session.roomId || "",
        });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editingSession) return;
        setSaving(true);
        await fetch(`/api/sessions/${editingSession.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                date: editForm.date,
                teacherId: editForm.teacherId || null,
                subjectIds: editForm.subjectIds,
                studentIds: editForm.studentIds,
                managerNote: editForm.managerNote,
                startTime: editForm.startTime,
                duration: editForm.duration,
                roomId: editForm.roomId || null,
            }),
        });
        // Reload sessions
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().slice(0, 10);
        const [todayData, tomorrowData] = await Promise.all([
            fetch(`/api/sessions?date=${todayStr}`).then((r) => r.json()),
            fetch(`/api/sessions?date=${tomorrowStr}`).then((r) => r.json()),
        ]);
        setTodaySessions(Array.isArray(todayData) ? todayData : []);
        setTomorrowSessions(Array.isArray(tomorrowData) ? tomorrowData : []);
        setShowEditModal(false);
        setEditingSession(null);
        setSaving(false);
    };

    const toggleEditSubject = (id: string) => {
        setEditForm((prev) => ({
            ...prev,
            subjectIds: prev.subjectIds.includes(id) ? prev.subjectIds.filter((s) => s !== id) : [...prev.subjectIds, id],
        }));
    };

    const toggleEditStudent = (id: string) => {
        setEditForm((prev) => ({
            ...prev,
            studentIds: prev.studentIds.includes(id) ? prev.studentIds.filter((s) => s !== id) : [...prev.studentIds, id],
        }));
    };

    const formatTomorrow = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toLocaleDateString("de-AT", { weekday: "long", day: "2-digit", month: "long" });
    };

    if (loading) return <div className="loading-center"><div className="spinner"></div></div>;

    const handleDeleteSession = async (sessionId: string, recurringGroupId?: string) => {
        if (!confirm("Soll diese Gruppe gelöscht werden?")) return;

        let url = `/api/sessions/${sessionId}`;
        if (recurringGroupId && confirm("Sollen auch alle zukünftigen Termine dieser Serie gelöscht werden?")) {
            url += "?deleteMode=future";
        }

        await fetch(url, { method: "DELETE" });
        // Reload
        const today = new Date().toISOString().slice(0, 10);
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().slice(0, 10);
        const [todayData, tomorrowData] = await Promise.all([
            fetch(`/api/sessions?date=${today}`).then((r) => r.json()),
            fetch(`/api/sessions?date=${tomorrowStr}`).then((r) => r.json()),
        ]);
        setTodaySessions(Array.isArray(todayData) ? todayData : []);
        setTomorrowSessions(Array.isArray(tomorrowData) ? tomorrowData : []);
        setShowEditModal(false);
    };

    const handleQuickClose = async (sessionId: string, completed: boolean) => {
        await fetch(`/api/sessions/${sessionId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed }),
        });
        // Optimistic update
        setTodaySessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, completed } : s));
        setTomorrowSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, completed } : s));
    };

    const renderSessionCard = (s: any, showDate?: boolean) => (
        <div
            key={s.id}
            className={`card card-clickable ${s.completed ? "" : "urgency-low"}`}
            onClick={() => router.push(`/dashboard/my-sessions/${s.id}`)}
            style={{ overflow: "hidden", position: "relative" }}
        >
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    {s.subjects?.length > 0 && (
                        s.subjects.map((sub: any) => <span key={sub.id} className="badge badge-primary">{sub.name}</span>)
                    )}
                    <span className={`badge ${s.completed ? "badge-success" : "badge-warning"}`}>
                        {s.completed ? "Abgeschlossen" : "Offen"}
                    </span>
                    {s.recurring && <span className="badge badge-muted">🔁</span>}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); openEditModal(s); }}
                        title="Bearbeiten"
                    >
                        ✏️
                    </button>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleQuickClose(s.id, !s.completed); }}
                        title={s.completed ? "Wieder öffnen" : "Abschließen"}
                    >
                        {s.completed ? "↩️" : "✓"}
                    </button>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap mb-2" style={{ fontSize: "0.75rem", color: "hsl(var(--muted-foreground))" }}>
                <span>{s.startTime} — {s.duration}min</span>
                {s.room && <span>🚪 {s.room.name}</span>}
            </div>
            <div className="text-sm text-muted-foreground mb-2">
                Lehrkraft: <strong>{s.teacher?.name || "Nicht zugewiesen"}</strong>
                {s.site && <span className="ml-2">📍 {s.site.name}</span>}
            </div>
            <div className="text-sm mb-3">
                {s.students?.length || 0} Schüler: {s.students?.map((st: any) => `${st.firstName} ${st.lastName}`).join(", ")}
            </div>
            {s.managerNote && <div className="post-it">{s.managerNote}</div>}
        </div>
    );

    return (
        <div>
            <div className="grid grid-3 mb-8">
                <div className="stat-card">
                    <div className="stat-value">{sites.length}</div>
                    <div className="stat-label">Meine Standorte</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{todaySessions.length}</div>
                    <div className="stat-label">Heutige Sitzungen</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{tomorrowSessions.length}</div>
                    <div className="stat-label">Morgige Sitzungen</div>
                </div>
            </div>

            {/* Teacher Notes (Inbox) */}
            <h2 className="text-xl font-semibold mb-4">📨 Nachrichten von Lehrkräften ({notes.length})</h2>
            {notes.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                    {notes.map((n) => (
                        <div key={n.id} className="card flex flex-col justify-between animate-fade-in" style={{ borderLeft: "4px solid hsl(var(--primary))" }}>
                            <div className="mb-3">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-semibold">{n.student?.firstName} {n.student?.lastName}</h3>
                                    <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleDateString("de-AT")}</span>
                                </div>
                                <div className="text-sm text-muted-foreground mb-2">von {n.teacher?.name}</div>
                                <p className="text-sm bg-muted/30 p-2 rounded">{n.content}</p>
                            </div>
                            <button className="btn btn-sm btn-outline w-full" onClick={() => markNoteDone(n.id)}>
                                ✅ Als erledigt markieren
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card mb-8">
                    <div className="text-muted-foreground text-sm flex items-center gap-2">
                        <span>✅</span> Alle Nachrichten abgearbeitet.
                    </div>
                </div>
            )}

            {/* Today's sessions */}
            <h2 className="text-xl font-semibold mb-4">📋 Heutige Gruppen</h2>
            {todaySessions.length === 0 ? (
                <div className="card mb-6">
                    <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <p>Keine Sitzungen für heute geplant.</p>
                        <button className="btn btn-primary mt-4" onClick={() => router.push("/dashboard/daily-plan")}>
                            Tagesplan erstellen
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-2 mb-8">
                    {todaySessions.map((s) => renderSessionCard(s))}
                </div>
            )}

            {/* Tomorrow's sessions */}
            <h2 className="text-xl font-semibold mb-4">📅 Morgige Gruppen — {formatTomorrow()}</h2>
            {tomorrowSessions.length === 0 ? (
                <div className="card mb-8">
                    <div className="empty-state" style={{ padding: "1.5rem" }}>
                        <p className="text-muted-foreground">Keine Sitzungen für morgen geplant.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-2 mb-8">
                    {tomorrowSessions.map((s) => renderSessionCard(s, true))}
                </div>
            )}

            <div className="grid grid-3">
                <div className="card card-clickable" onClick={() => router.push("/dashboard/daily-plan")}>
                    <h3 className="card-title">📋 Tagesplan</h3>
                    <p className="card-description">Schüler in Gruppen einteilen und Lehrkräften zuweisen.</p>
                </div>
                <div className="card card-clickable" onClick={() => router.push("/dashboard/students")}>
                    <h3 className="card-title">🎓 Schüler</h3>
                    <p className="card-description">Schüler verwalten, Dringlichkeitsinfo ansehen.</p>
                </div>
                <div className="card card-clickable" onClick={() => router.push("/dashboard/teachers")}>
                    <h3 className="card-title">👨‍🏫 Lehrkräfte</h3>
                    <p className="card-description">Lehrkräfte anlegen und verwalten.</p>
                </div>
                <div className="card card-clickable" onClick={() => router.push("/dashboard/calendar")}>
                    <h3 className="card-title">📅 Kalender</h3>
                    <p className="card-description">Termine und Schularbeiten im Überblick.</p>
                </div>
                <div className="card card-clickable" onClick={() => router.push("/dashboard/teacher-notes")}>
                    <h3 className="card-title">📨 Nachrichten-Archiv</h3>
                    <p className="card-description">Alle Nachrichten der letzten 30+ Tage ansehen.</p>
                </div>
            </div>

            {/* Edit Session Modal */}
            {showEditModal && editingSession && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Gruppe bearbeiten</h2>

                        <div className="form-group mb-4">
                            <label className="form-label">📅 Datum</label>
                            <input className="input" type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
                        </div>

                        <div className="form-row mb-4">
                            <div className="form-group">
                                <label className="form-label">🕐 Startzeit</label>
                                <select className="select" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}>
                                    {Array.from({ length: 24 }, (_, i) => [`${i.toString().padStart(2, "0")}:00`, `${i.toString().padStart(2, "0")}:15`, `${i.toString().padStart(2, "0")}:30`, `${i.toString().padStart(2, "0")}:45`]).flat().map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">⏱️ Dauer</label>
                                <div className="flex gap-2 flex-wrap">
                                    {[45, 60, 90, 120].map((d) => (
                                        <button key={d} className={`btn btn-sm ${editForm.duration === d ? "btn-primary" : "btn-outline"}`} onClick={() => setEditForm({ ...editForm, duration: d })}>{d} Min.</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="form-row mb-4">
                            <div className="form-group">
                                <label className="form-label">👨‍🏫 Lehrkraft</label>
                                <select className="select" value={editForm.teacherId} onChange={(e) => setEditForm({ ...editForm, teacherId: e.target.value })}>
                                    <option value="">Nicht zugewiesen</option>
                                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">🚪 Raum</label>
                                <select className="select" value={editForm.roomId} onChange={(e) => setEditForm({ ...editForm, roomId: e.target.value })}>
                                    <option value="">Kein Raum</option>
                                    {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-group mb-4">
                            <label className="form-label">📚 Fächer</label>
                            <div className="flex flex-wrap gap-2">
                                {subjects.map((sub) => (
                                    <button
                                        key={sub.id}
                                        className={`chip ${editForm.subjectIds.includes(sub.id) ? "chip-active" : ""}`}
                                        onClick={() => toggleEditSubject(sub.id)}
                                    >
                                        {sub.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group mb-4">
                            <label className="form-label">🎓 Schüler ({editForm.studentIds.length} ausgewählt)</label>
                            <div className="flex flex-wrap gap-2" style={{ maxHeight: "150px", overflowY: "auto" }}>
                                {students.map((st) => (
                                    <button
                                        key={st.id}
                                        className={`chip ${editForm.studentIds.includes(st.id) ? "chip-active" : ""}`}
                                        onClick={() => toggleEditStudent(st.id)}
                                    >
                                        {st.firstName} {st.lastName}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group mb-4">
                            <label className="form-label">📌 Anmerkung</label>
                            <textarea className="textarea" value={editForm.managerNote} onChange={(e) => setEditForm({ ...editForm, managerNote: e.target.value })} />
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Abbrechen</button>
                            <button className="btn btn-outline" onClick={() => { setShowEditModal(false); router.push(`/dashboard/my-sessions/${editingSession.id}`); }}>📋 Detailansicht</button>
                            <button className="btn btn-outline text-destructive" onClick={() => handleDeleteSession(editingSession.id, editingSession.recurringGroupId)}>Löschen</button>
                            <button className="btn btn-primary" onClick={handleSaveEdit} disabled={saving}>
                                {saving ? "Speichere..." : "Speichern"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
