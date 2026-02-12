"use client";

import { useEffect, useState } from "react";

export default function TeachersPage() {
    const [teachers, setTeachers] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", password: "", siteIds: [] as string[], subjectIds: [] as string[], teacherNote: "" });
    const [saving, setSaving] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
    const [editForm, setEditForm] = useState<any>(null);
    const [teacherSessions, setTeacherSessions] = useState<any[]>([]);
    const [sessionsMonth, setSessionsMonth] = useState(() => new Date().toISOString().slice(0, 7)); // "YYYY-MM"
    const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);

    const loadData = () => {
        Promise.all([
            fetch("/api/users?role=TEACHER").then((r) => r.json()),
            fetch("/api/sites").then((r) => r.json()),
            fetch("/api/subjects").then((r) => r.json()),
        ]).then(([t, s, sub]) => {
            setTeachers(Array.isArray(t) ? t : []);
            setSites(Array.isArray(s) ? s : []);
            setSubjects(Array.isArray(sub) ? sub : []);
            setLoading(false);
        });
    };

    useEffect(() => { loadData(); }, []);

    // Load sessions for selected teacher in the given month
    useEffect(() => {
        if (!selectedTeacher) return;
        const [year, month] = sessionsMonth.split("-").map(Number);
        const from = new Date(year, month - 1, 1).toISOString().slice(0, 10);
        const to = new Date(year, month, 0).toISOString().slice(0, 10);
        fetch(`/api/sessions?from=${from}&to=${to}&teacherId=${selectedTeacher.id}`)
            .then((r) => r.json())
            .then((data) => setTeacherSessions(Array.isArray(data) ? data : []));

        // Load upcoming sessions (next 30 days)
        const today = new Date();
        const future = new Date(today);
        future.setDate(future.getDate() + 60);
        fetch(`/api/sessions?from=${today.toISOString().slice(0, 10)}&to=${future.toISOString().slice(0, 10)}&teacherId=${selectedTeacher.id}`)
            .then((r) => r.json())
            .then((data) => setUpcomingSessions(Array.isArray(data) ? data : []));
    }, [selectedTeacher, sessionsMonth]);

    const handleCreate = async () => {
        setSaving(true);
        const res = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, role: "TEACHER" }),
        });
        if (res.ok) {
            setForm({ name: "", email: "", password: "", siteIds: [], subjectIds: [], teacherNote: "" });
            setShowModal(false);
            loadData();
        } else {
            const err = await res.json();
            alert(err.error || "Fehler");
        }
        setSaving(false);
    };

    const handleUpdate = async () => {
        if (!selectedTeacher || !editForm) return;
        setSaving(true);
        await fetch(`/api/users/${selectedTeacher.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: editForm.name,
                email: editForm.email,
                teacherNote: editForm.teacherNote,
                subjectIds: editForm.subjectIds,
                siteIds: editForm.siteIds,
                password: editForm.password,
            }),
        });
        setSaving(false);
        loadData();
        // Refresh selected teacher data
        const updated = await fetch(`/api/users/${selectedTeacher.id}`).then((r) => r.json());
        setSelectedTeacher(updated);
        setEditForm(null);
    };

    const handleDelete = async () => {
        if (!selectedTeacher) return;
        if (!confirm(`Sind Sie sicher, dass Sie die Lehrkraft "${selectedTeacher.name}" unwiderruflich löschen möchten?`)) return;

        const res = await fetch(`/api/users/${selectedTeacher.id}`, { method: "DELETE" });
        if (res.ok) {
            setSelectedTeacher(null);
            loadData();
        } else {
            alert("Fehler beim Löschen.");
        }
    };

    const openTeacherDetail = (teacher: any) => {
        setSelectedTeacher(teacher);
        setEditForm(null);
    };

    const startEdit = () => {
        if (!selectedTeacher) return;
        setEditForm({
            name: selectedTeacher.name,
            email: selectedTeacher.email,
            teacherNote: selectedTeacher.teacherNote || "",
            subjectIds: selectedTeacher.teachableSubjects?.map((s: any) => s.id) || [],
            siteIds: selectedTeacher.sites?.map((s: any) => s.id) || [],
            password: "",
        });
    };

    // ... (helper functions omitted for brevity in replacement)

    const toggleSite = (siteId: string) => {
        setForm((prev) => ({
            ...prev,
            siteIds: prev.siteIds.includes(siteId) ? prev.siteIds.filter((id) => id !== siteId) : [...prev.siteIds, siteId],
        }));
    };

    const toggleFormSubject = (subId: string) => {
        setForm((prev) => ({
            ...prev,
            subjectIds: prev.subjectIds.includes(subId) ? prev.subjectIds.filter((id) => id !== subId) : [...prev.subjectIds, subId],
        }));
    };

    // Stats for monthly overview
    const totalSessions = teacherSessions.length;
    const totalStudents = teacherSessions.reduce((acc, s) => acc + (s.students?.length || 0), 0);
    const avgStudents = totalSessions > 0 ? (totalStudents / totalSessions).toFixed(1) : "—";

    if (loading) return <div className="loading-center"><div className="spinner"></div></div>;

    // Teacher detail view
    if (selectedTeacher) {
        return (
            <div className="animate-fade-in">
                <button className="btn btn-ghost mb-4" onClick={() => { setSelectedTeacher(null); setEditForm(null); }}>← Zurück zur Übersicht</button>

                <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="avatar" style={{ width: "56px", height: "56px", fontSize: "1.5rem" }}>{selectedTeacher.name?.charAt(0)?.toUpperCase()}</div>
                        <div>
                            <h1 className="page-title" style={{ marginBottom: "0.25rem" }}>{selectedTeacher.name}</h1>
                            <p className="text-sm text-muted-foreground">{selectedTeacher.email}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {!editForm && (
                            <>
                                <button className="btn btn-primary" onClick={startEdit}>✏️ Bearbeiten</button>
                                <button className="btn btn-ghost text-destructive" onClick={handleDelete} title="Lehrkraft löschen">🗑️</button>
                            </>
                        )}
                    </div>
                </div>

                {/* Edit form */}
                {editForm && (
                    <div className="card mb-6 animate-slide-up">
                        <h3 className="font-semibold mb-4">Profil bearbeiten</h3>
                        <div className="form-row mb-4">
                            <div className="form-group">
                                <label className="form-label">Name</label>
                                <input className="input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input className="input" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Neues Passwort (leer lassen = unverändert)</label>
                            <input className="input" type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="Passwort ändern (optional)" />
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Notiz zur Lehrkraft</label>
                            <textarea className="textarea" value={editForm.teacherNote} onChange={(e) => setEditForm({ ...editForm, teacherNote: e.target.value })} placeholder="z.B. kann nur Unterstufe; nur in Notfällen aufrufen..." />
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Unterrichtbare Fächer</label>
                            <div className="flex flex-wrap gap-2">
                                {subjects.map((s) => (
                                    <label key={s.id} className="checkbox-wrapper">
                                        <input type="checkbox" checked={editForm.subjectIds.includes(s.id)} onChange={() => setEditForm({ ...editForm, subjectIds: editForm.subjectIds.includes(s.id) ? editForm.subjectIds.filter((id: string) => id !== s.id) : [...editForm.subjectIds, s.id] })} />
                                        <span className="text-sm">{s.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Standorte</label>
                            <div className="flex flex-wrap gap-2">
                                {sites.map((s) => (
                                    <label key={s.id} className="checkbox-wrapper">
                                        <input type="checkbox" checked={editForm.siteIds.includes(s.id)} onChange={() => setEditForm({ ...editForm, siteIds: editForm.siteIds.includes(s.id) ? editForm.siteIds.filter((id: string) => id !== s.id) : [...editForm.siteIds, s.id] })} />
                                        <span className="text-sm">{s.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="btn btn-primary" onClick={handleUpdate} disabled={saving}>{saving ? "Speichere..." : "💾 Speichern"}</button>
                            <button className="btn btn-secondary" onClick={() => setEditForm(null)}>Abbrechen</button>
                        </div>
                    </div>
                )
                }

                {/* Info overview */}
                {
                    !editForm && (
                        <div className="grid grid-2 mb-6">
                            <div className="card">
                                <h3 className="font-semibold mb-3">📋 Fächer</h3>
                                {selectedTeacher.teachableSubjects?.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedTeacher.teachableSubjects.map((s: any) => <span key={s.id} className="badge badge-primary">{s.name}</span>)}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Keine Fächer zugewiesen</p>
                                )}
                            </div>
                            <div className="card">
                                <h3 className="font-semibold mb-3">📝 Notiz</h3>
                                <p className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{selectedTeacher.teacherNote || <span className="text-muted-foreground">Keine Notiz hinterlegt</span>}</p>
                            </div>
                        </div>
                    )
                }

                {/* Monthly overview */}
                <div className="card mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">📅 Monatsübersicht — Gehaltene Gruppen</h3>
                        <input className="input" type="month" value={sessionsMonth} onChange={(e) => setSessionsMonth(e.target.value)} style={{ maxWidth: "200px" }} />
                    </div>

                    {teacherSessions.length > 0 ? (
                        <>
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Datum</th>
                                            <th>Uhrzeit</th>
                                            <th>Standort</th>
                                            <th>Fächer</th>
                                            <th>Schüler</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teacherSessions.map((s) => (
                                            <tr key={s.id}>
                                                <td>{new Date(s.date).toLocaleDateString("de-AT", { weekday: "short", day: "2-digit", month: "2-digit" })}</td>
                                                <td>{s.startTime} ({s.duration}min)</td>
                                                <td>{s.site?.name || "—"}</td>
                                                <td>{s.subjects?.map((sub: any) => sub.name).join(", ") || "—"}</td>
                                                <td>{s.students?.length || 0}</td>
                                                <td><span className={`badge ${s.completed ? "badge-success" : "badge-warning"}`}>{s.completed ? "Fertig" : "Offen"}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex gap-6 mt-4 p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--secondary))" }}>
                                <div><strong>Gesamt:</strong> {totalSessions} Gruppen</div>
                                <div><strong>Schüler insgesamt:</strong> {totalStudents}</div>
                                <div><strong>⌀ Schüler/Gruppe:</strong> {avgStudents}</div>
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-state-icon">📭</div>
                            <p>Keine Gruppen in diesem Monat.</p>
                        </div>
                    )}
                </div>

                {/* Upcoming / future sessions */}
                <div className="card">
                    <h3 className="font-semibold mb-4">🔮 Bevorstehende Gruppen (nächste 60 Tage)</h3>
                    {upcomingSessions.filter((s) => new Date(s.date) >= new Date()).length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {upcomingSessions
                                .filter((s) => new Date(s.date) >= new Date())
                                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                .map((s) => (
                                    <div key={s.id} className="info-bar">
                                        <span className="font-semibold">{new Date(s.date).toLocaleDateString("de-AT", { weekday: "short", day: "2-digit", month: "2-digit" })}</span>
                                        <span>{s.startTime}</span>
                                        <span className="badge badge-muted">{s.site?.name}</span>
                                        {s.subjects?.map((sub: any) => <span key={sub.id} className="badge badge-primary">{sub.name}</span>)}
                                        <span className="text-sm">{s.students?.length || 0} Schüler</span>
                                        {s.recurring && <span className="badge badge-secondary">🔄 Wöchentlich</span>}
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-state-icon">📋</div>
                            <p>Keine bevorstehenden Gruppen.</p>
                        </div>
                    )}
                </div>
            </div >
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">👨‍🏫 Lehrkräfte</h1>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Neue Lehrkraft</button>
            </div>

            {/* Teacher list */}
            {teachers.length > 0 ? (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th></th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Fächer</th>
                                <th>Standorte</th>
                                <th>Notiz</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teachers.map((t) => (
                                <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => openTeacherDetail(t)}>
                                    <td><div className="avatar" style={{ width: "32px", height: "32px", fontSize: "0.8rem" }}>{t.name?.charAt(0)?.toUpperCase()}</div></td>
                                    <td><strong>{t.name}</strong></td>
                                    <td className="text-sm text-muted-foreground">{t.email}</td>
                                    <td>{t.teachableSubjects?.map((s: any) => <span key={s.id} className="badge badge-primary" style={{ marginRight: "4px" }}>{s.name}</span>) || "—"}</td>
                                    <td>{t.sites?.map((s: any) => <span key={s.id} className="badge badge-muted" style={{ marginRight: "4px" }}>{s.name}</span>) || "—"}</td>
                                    <td className="text-xs text-muted-foreground" style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.teacherNote || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="card"><div className="empty-state">
                    <div className="empty-state-icon">👨‍🏫</div>
                    <p>Keine Lehrkräfte vorhanden.</p>
                </div></div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
                        <h2 className="modal-title">Neue Lehrkraft anlegen</h2>
                        <div className="form-row mb-4">
                            <div className="form-group">
                                <label className="form-label">Name *</label>
                                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Passwort *</label>
                            <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Notiz zur Lehrkraft</label>
                            <textarea className="textarea" value={form.teacherNote} onChange={(e) => setForm({ ...form, teacherNote: e.target.value })} placeholder="z.B. kann nur Unterstufe; nur in Notfällen..." />
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Unterrichtbare Fächer</label>
                            <div className="flex flex-wrap gap-2">
                                {subjects.map((s) => (
                                    <label key={s.id} className="checkbox-wrapper">
                                        <input type="checkbox" checked={form.subjectIds.includes(s.id)} onChange={() => toggleFormSubject(s.id)} />
                                        <span className="text-sm">{s.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Standorte</label>
                            <div className="flex flex-wrap gap-2">
                                {sites.map((s) => (
                                    <label key={s.id} className="checkbox-wrapper">
                                        <input type="checkbox" checked={form.siteIds.includes(s.id)} onChange={() => toggleSite(s.id)} />
                                        <span className="text-sm">{s.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Abbrechen</button>
                            <button className="btn btn-primary" onClick={handleCreate} disabled={!form.name || !form.email || !form.password || saving}>
                                {saving ? "Erstelle..." : "Erstellen"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
