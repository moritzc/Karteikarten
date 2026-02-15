"use client";

import { useEffect, useState, useMemo } from "react";

const TIME_SLOTS = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30", "18:00", "18:30", "19:00",
];

const DURATION_PRESETS = [30, 45, 60, 90, 120];
const dayLabels = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

// Reusable Student Search & Select component
function StudentSelector({ students, selectedIds, onToggle }: { students: any[]; selectedIds: string[]; onToggle: (id: string) => void }) {
    const [search, setSearch] = useState("");
    const filtered = useMemo(() => {
        if (!search) return students;
        const q = search.toLowerCase();
        return students.filter((s) => `${s.firstName} ${s.lastName}`.toLowerCase().includes(q));
    }, [students, search]);

    return (
        <div>
            <div className="flex gap-2 flex-wrap mb-2">
                {selectedIds.map((id) => {
                    const s = students.find((st) => st.id === id);
                    return s ? (
                        <span key={id} className="chip chip-removable" onClick={() => onToggle(id)}>
                            {s.firstName} {s.lastName} ✕
                        </span>
                    ) : null;
                })}
            </div>
            <input
                className="input mb-2"
                placeholder="🔍 Schüler suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", padding: "0.25rem" }}>
                {filtered.filter((s) => !selectedIds.includes(s.id)).map((student) => (
                    <div
                        key={student.id}
                        className="p-2 rounded cursor-pointer"
                        style={{ fontSize: "0.875rem" }}
                        onClick={() => onToggle(student.id)}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--secondary))")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                        {student.firstName} {student.lastName}
                    </div>
                ))}
                {filtered.filter((s) => !selectedIds.includes(s.id)).length === 0 && (
                    <p className="text-sm text-muted-foreground p-2">{search ? "Keine Ergebnisse." : "Alle Schüler ausgewählt."}</p>
                )}
            </div>
        </div>
    );
}

// Multi-Subject selector
function SubjectMultiSelect({ subjects, selectedIds, onToggle }: { subjects: any[]; selectedIds: string[]; onToggle: (id: string) => void }) {
    return (
        <div>
            <div className="flex gap-2 flex-wrap mb-2">
                {selectedIds.map((id) => {
                    const s = subjects.find((sub: any) => sub.id === id);
                    return s ? (
                        <span key={id} className="chip chip-removable" onClick={() => onToggle(id)}>
                            {s.name} ✕
                        </span>
                    ) : null;
                })}
            </div>
            <select
                className="select"
                onChange={(e) => { if (e.target.value) { onToggle(e.target.value); e.target.value = ""; } }}
                value=""
            >
                <option value="">Fach hinzufügen...</option>
                {subjects.filter((s: any) => !selectedIds.includes(s.id)).map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
        </div>
    );
}

const searchParams = useSearchParams();
const router = useRouter();

const [sites, setSites] = useState<any[]>([]);
const [students, setStudents] = useState<any[]>([]);
const [teachers, setTeachers] = useState<any[]>([]);
const [subjects, setSubjects] = useState<any[]>([]);
const [rooms, setRooms] = useState<any[]>([]);
const [sessions, setSessions] = useState<any[]>([]);

const [selectedSite, setSelectedSite] = useState(searchParams.get("siteId") || "");
const [selectedDate, setSelectedDate] = useState(() => {
    const paramDate = searchParams.get("date");
    // Validate date format yyyy-mm-dd
    return paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate)
        ? paramDate
        : new Date().toISOString().slice(0, 10);
});
const [loading, setLoading] = useState(true);
const [showModal, setShowModal] = useState(false);
const [showEditModal, setShowEditModal] = useState(false);
const [editingSession, setEditingSession] = useState<any>(null);
const [showAdvancedTime, setShowAdvancedTime] = useState(false);
const [saving, setSaving] = useState(false);
const [conflictWarning, setConflictWarning] = useState<string | null>(null);
const [editConflictWarning, setEditConflictWarning] = useState<string | null>(null);
const [form, setForm] = useState({
    teacherId: "",
    subjectIds: [] as string[],
    studentIds: [] as string[],
    managerNote: "",
    startTime: "14:30",
    duration: 90,
    recurring: false,
    weeksToCreate: 8,
    roomId: "",
});
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

useEffect(() => {
    Promise.all([
        fetch("/api/sites").then((r) => r.json()),
        fetch("/api/subjects").then((r) => r.json()),
    ]).then(([s, sub]) => {
        setSites(Array.isArray(s) ? s : []);
        setSubjects(Array.isArray(sub) ? sub : []);
        if (Array.isArray(s) && s.length > 0) setSelectedSite(s[0].id);
        setLoading(false);
    });
}, []);

const loadSessions = () => {
    if (!selectedSite) return;
    Promise.all([
        fetch(`/api/students?siteId=${selectedSite}`).then((r) => r.json()),
        fetch(`/api/users?siteId=${selectedSite}&role=TEACHER`).then((r) => r.json()),
        fetch(`/api/sessions?siteId=${selectedSite}&date=${selectedDate}`).then((r) => r.json()),
        fetch(`/api/rooms?siteId=${selectedSite}`).then((r) => r.json()),
    ]).then(([s, t, sess, rm]) => {
        setStudents(Array.isArray(s) ? s : []);
        setTeachers(Array.isArray(t) ? t : []);
        setSessions(Array.isArray(sess) ? sess : []);
        setRooms(Array.isArray(rm) ? rm : []);
    });
};

useEffect(() => { loadSessions(); }, [selectedSite, selectedDate]);

const toggleFormSubject = (id: string) => {
    setForm((prev) => ({
        ...prev,
        subjectIds: prev.subjectIds.includes(id) ? prev.subjectIds.filter((s) => s !== id) : [...prev.subjectIds, id],
    }));
};

const toggleFormStudent = (id: string) => {
    setForm((prev) => ({
        ...prev,
        studentIds: prev.studentIds.includes(id) ? prev.studentIds.filter((s) => s !== id) : [...prev.studentIds, id],
    }));
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

const handleCreate = async () => {
    setSaving(true);
    await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...form,
            siteId: selectedSite,
            date: selectedDate,
        }),
    });
    setForm({
        teacherId: "", subjectIds: [], studentIds: [], managerNote: "",
        startTime: "14:30", duration: 90, recurring: false, weeksToCreate: 8, roomId: "",
    });
    setConflictWarning(null);
    setShowModal(false);
    setShowAdvancedTime(false);
    setSaving(false);
    loadSessions();
};

const openEditModal = (session: any) => {
    setEditingSession(session);
    setEditForm({
        date: session.date ? new Date(session.date).toISOString().slice(0, 10) : selectedDate,
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
    setShowEditModal(false);
    setEditingSession(null);
    setEditConflictWarning(null);
    setSaving(false);
    loadSessions();
};

const handleUpdateNote = async (sessionId: string, note: string) => {
    await fetch(`/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerNote: note }),
    });
};

const checkConflict = async (teacherId: string, date: string, startTime: string, duration: number, mode: "create" | "edit", excludeId?: string) => {
    if (!teacherId || !date || !startTime) {
        if (mode === "create") setConflictWarning(null);
        else setEditConflictWarning(null);
        return;
    }
    try {
        let url = `/api/sessions/conflicts?teacherId=${teacherId}&date=${date}&startTime=${startTime}&duration=${duration}`;
        if (excludeId) url += `&excludeId=${excludeId}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.hasConflict) {
            if (mode === "create") setConflictWarning(data.message);
            else setEditConflictWarning(data.message);
        } else {
            if (mode === "create") setConflictWarning(null);
            else setEditConflictWarning(null);
        }
    } catch { /* ignore */ }
};

// Trigger conflict check when teacher/time changes in create form
useEffect(() => {
    checkConflict(form.teacherId, selectedDate, form.startTime, form.duration, "create");
}, [form.teacherId, selectedDate, form.startTime, form.duration]);

// Trigger conflict check when teacher/time changes in edit form
useEffect(() => {
    if (editingSession) {
        checkConflict(editForm.teacherId, editForm.date, editForm.startTime, editForm.duration, "edit", editingSession.id);
    }
}, [editForm.teacherId, editForm.date, editForm.startTime, editForm.duration]);

const handleQuickTeacherChange = async (sessionId: string, teacherId: string, recurringGroupId?: string) => {
    const body: any = { teacherId: teacherId || null };
    if (recurringGroupId && confirm("Lehrkraft auch für alle zukünftigen Termine dieser Gruppe ändern?")) {
        body.updateRecurringTeacher = true;
        body.recurringGroupId = recurringGroupId;
    }
    await fetch(`/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    loadSessions();
};

const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Gruppe wirklich löschen?")) return;
    await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
    loadSessions();
};

const formatTime = (startTime: string, duration: number) => {
    const [h, m] = startTime.split(":").map(Number);
    const endMinutes = h * 60 + m + duration;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    return `${startTime} – ${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")} (${duration} Min.)`;
};

if (loading) return <div className="loading-center"><div className="spinner"></div></div>;

return (
    <div className="animate-fade-in">
        <div className="page-header">
            <h1 className="page-title">📋 Tagesplan</h1>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Neue Gruppe</button>
        </div>

        {/* Site & Date selection */}
        <div className="filter-bar">
            <div className="form-group">
                <label className="form-label">Standort</label>
                <select className="select" value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)}>
                    {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <div className="form-group">
                <label className="form-label">Datum</label>
                <input className="input" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 ml-auto">
                {selectedDate && (
                    <span className="badge badge-muted">
                        {dayLabels[(new Date(selectedDate).getDay() + 6) % 7]}
                    </span>
                )}
                <span className="badge badge-primary">{sessions.length} Gruppen</span>
            </div>
        </div>

        {/* Sessions List */}
        {sessions.length === 0 ? (
            <div className="card">
                <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <p>Keine Gruppen für diesen Tag geplant.</p>
                    <button className="btn btn-primary mt-4" onClick={() => setShowModal(true)}>Gruppe erstellen</button>
                </div>
            </div>
        ) : (
            <div className="grid grid-2">
                {sessions.map((s) => (
                    <div key={s.id} className={`card ${s.completed ? "urgency-low" : ""}`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                {s.subjects?.map((sub: any) => (
                                    <span key={sub.id} className="badge badge-primary">{sub.name}</span>
                                ))}
                                <span className={`badge ${s.completed ? "badge-success" : "badge-warning"}`}>
                                    {s.completed ? "Abgeschlossen" : "Offen"}
                                </span>
                                {s.recurring && <span className="badge badge-muted">🔁</span>}
                            </div>
                            <div className="flex gap-1">
                                <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(s)} title="Bearbeiten">✏️</button>
                                <button className="btn btn-ghost btn-sm text-destructive" onClick={() => handleDeleteSession(s.id)}>✕</button>
                            </div>
                        </div>

                        <div className="info-bar mb-2">
                            <strong>🕐 {formatTime(s.startTime || "14:30", s.duration || 90)}</strong>
                            {s.room && <span className="badge badge-muted ml-2">🚪 {s.room.name}</span>}
                        </div>

                        <div className="form-group mb-2">
                            <label className="form-label" style={{ fontSize: "0.75rem" }}>👨‍🏫 Lehrkraft</label>
                            <select
                                className="select"
                                value={s.teacherId || ""}
                                onChange={(e) => handleQuickTeacherChange(s.id, e.target.value, s.recurringGroupId)}
                                style={{ height: "2rem", fontSize: "0.85rem" }}
                            >
                                <option value="">Nicht zugewiesen</option>
                                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>

                        <div className="text-sm mb-2">
                            <strong>Schüler ({s.students?.length || 0}):</strong>{" "}
                            {s.students?.map((st: any) => `${st.firstName} ${st.lastName}`).join(", ") || "Keine"}
                        </div>

                        <div className="form-group">
                            <label className="form-label">📌 Anmerkung</label>
                            <textarea
                                className="textarea"
                                style={{ minHeight: "2.5rem", fontSize: "0.85rem" }}
                                defaultValue={s.managerNote || ""}
                                onBlur={(e) => handleUpdateNote(s.id, e.target.value)}
                                placeholder="Anmerkung an Lehrkraft..."
                            />
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* ===== CREATE SESSION MODAL ===== */}
        {showModal && (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
                <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
                    <h2 className="modal-title">Neue Gruppe erstellen</h2>

                    {/* Time */}
                    <div className="card mb-4" style={{ padding: "1rem", backgroundColor: "hsl(var(--secondary))" }}>
                        <div className="flex items-center justify-between mb-3">
                            <label className="form-label font-semibold mb-0">🕐 Uhrzeit & Dauer</label>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdvancedTime(!showAdvancedTime)}>
                                {showAdvancedTime ? "Einfach" : "Erweitert"}
                            </button>
                        </div>
                        {showAdvancedTime ? (
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Startzeit</label><input className="input" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Dauer (Min.)</label><input className="input" type="number" min={15} step={5} value={form.duration} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 90 })} /></div>
                            </div>
                        ) : (
                            <div>
                                <div className="form-group mb-3">
                                    <label className="form-label">Startzeit</label>
                                    <select className="select" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}>
                                        {TIME_SLOTS.map((t) => <option key={t} value={t}>{t} Uhr</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Dauer</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {DURATION_PRESETS.map((d) => (
                                            <button key={d} className={`btn btn-sm ${form.duration === d ? "btn-primary" : "btn-outline"}`} onClick={() => setForm({ ...form, duration: d })}>{d} Min.</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="form-row mb-4">
                        <div className="form-group">
                            <label className="form-label">Lehrkraft</label>
                            <select className="select" value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
                                <option value="">Nicht zugewiesen</option>
                                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">🚪 Raum</label>
                            <select className="select" value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })}>
                                <option value="">Kein Raum</option>
                                {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Conflict warning */}
                    {conflictWarning && (
                        <div className="mb-4" style={{ padding: "0.75rem 1rem", borderRadius: "8px", backgroundColor: "hsl(45, 100%, 90%)", border: "1px solid hsl(45, 100%, 60%)", color: "hsl(30, 80%, 25%)" }}>
                            <strong>⚠️ Buchungskonflikt:</strong> {conflictWarning}
                        </div>
                    )}

                    {/* Multi-Subject */}
                    <div className="form-group mb-4">
                        <label className="form-label">📚 Fächer</label>
                        <SubjectMultiSelect subjects={subjects} selectedIds={form.subjectIds} onToggle={toggleFormSubject} />
                    </div>

                    {/* Recurring */}
                    <div className="card mb-4" style={{ padding: "0.75rem 1rem", backgroundColor: "hsl(var(--secondary))" }}>
                        <label className="checkbox-wrapper">
                            <input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} />
                            <span className="text-sm font-medium">🔁 Wöchentlich wiederholen</span>
                        </label>
                        {form.recurring && (
                            <div className="form-group mt-3">
                                <label className="form-label">Für wie viele Wochen? (Ferien werden übersprungen)</label>
                                <div className="flex gap-2 flex-wrap">
                                    {[{ w: 4, l: "1 Monat" }, { w: 8, l: "2 Monate" }, { w: 13, l: "Quartal" }, { w: 26, l: "Halbjahr" }, { w: 39, l: "¾ Jahr" }, { w: 52, l: "1 Jahr" }].map(({ w, l }) => (
                                        <button key={w} className={`btn btn-sm ${form.weeksToCreate === w ? "btn-primary" : "btn-outline"}`} onClick={() => setForm({ ...form, weeksToCreate: w })}>{l} ({w}W)</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Student Search */}
                    <div className="form-group mb-4">
                        <label className="form-label">🎓 Schüler ({form.studentIds.length} ausgewählt)</label>
                        <StudentSelector students={students} selectedIds={form.studentIds} onToggle={toggleFormStudent} />
                    </div>

                    <div className="form-group mb-4">
                        <label className="form-label">📌 Anmerkung an Lehrkraft</label>
                        <textarea className="textarea" value={form.managerNote} onChange={(e) => setForm({ ...form, managerNote: e.target.value })} placeholder="z.B. Bitte Noten eintragen..." />
                    </div>

                    <div className="modal-actions">
                        <button className="btn btn-secondary" onClick={() => { setShowModal(false); setShowAdvancedTime(false); }}>Abbrechen</button>
                        <button className="btn btn-primary" onClick={handleCreate} disabled={form.studentIds.length === 0 || saving}>
                            {saving ? "Erstelle..." : form.recurring ? `${form.weeksToCreate} Termine erstellen` : "Gruppe erstellen"}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* ===== EDIT SESSION MODAL ===== */}
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
                                {TIME_SLOTS.map((t) => <option key={t} value={t}>{t} Uhr</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Dauer</label>
                            <div className="flex gap-2 flex-wrap">
                                {DURATION_PRESETS.map((d) => (
                                    <button key={d} className={`btn btn-sm ${editForm.duration === d ? "btn-primary" : "btn-outline"}`} onClick={() => setEditForm({ ...editForm, duration: d })}>{d} Min.</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="form-row mb-4">
                        <div className="form-group">
                            <label className="form-label">Lehrkraft</label>
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

                    {/* Edit conflict warning */}
                    {editConflictWarning && (
                        <div className="mb-4" style={{ padding: "0.75rem 1rem", borderRadius: "8px", backgroundColor: "hsl(45, 100%, 90%)", border: "1px solid hsl(45, 100%, 60%)", color: "hsl(30, 80%, 25%)" }}>
                            <strong>⚠️ Buchungskonflikt:</strong> {editConflictWarning}
                        </div>
                    )}
                    <div className="form-group mb-4">
                        <label className="form-label">📚 Fächer</label>
                        <SubjectMultiSelect subjects={subjects} selectedIds={editForm.subjectIds} onToggle={toggleEditSubject} />
                    </div>

                    <div className="form-group mb-4">
                        <label className="form-label">🎓 Schüler ({editForm.studentIds.length} ausgewählt)</label>
                        <StudentSelector students={students} selectedIds={editForm.studentIds} onToggle={toggleEditStudent} />
                    </div>

                    <div className="form-group mb-4">
                        <label className="form-label">📌 Anmerkung</label>
                        <textarea className="textarea" value={editForm.managerNote} onChange={(e) => setEditForm({ ...editForm, managerNote: e.target.value })} />
                    </div>

                    <div className="modal-actions">
                        <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Abbrechen</button>
                        <button className="btn btn-primary" onClick={handleSaveEdit} disabled={saving}>
                            {saving ? "Speichere..." : "Änderungen speichern"}
                        </button>
                    </div>
                </div>
            </div>
        )}
        );
}
