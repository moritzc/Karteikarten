"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function StudentsPage() {
    const { data: session } = useSession();
    const role = (session?.user as any)?.role;
    const router = useRouter();
    const [students, setStudents] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState("");
    const [filterSite, setFilterSite] = useState("");
    const [filterSubject, setFilterSubject] = useState("");
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [showArchived, setShowArchived] = useState(false);
    const [form, setForm] = useState({ firstName: "", lastName: "", birthDate: "", note: "", siteIds: [] as string[] });
    const [saving, setSaving] = useState(false);

    const loadData = () => {
        setLoading(true);
        const query = showArchived ? "?includeArchived=true" : "";
        Promise.all([
            fetch(`/api/students${query}`).then((r) => r.json()),
            fetch("/api/sites").then((r) => r.json()),
            fetch("/api/subjects").then((r) => r.json()),
        ]).then(([s, si, su]) => {
            setStudents(Array.isArray(s) ? s : []);
            setSites(Array.isArray(si) ? si : []);
            setSubjects(Array.isArray(su) ? su : []);
            setLoading(false);
        });
    };

    useEffect(() => { loadData(); }, [showArchived]);

    const handleCreate = async () => {
        setSaving(true);
        await fetch("/api/students", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        setForm({ firstName: "", lastName: "", birthDate: "", note: "", siteIds: [] });
        setShowModal(false);
        setSaving(false);
        loadData();
    };

    // ... (helper functions omitted for brevity in replacement)

    const toggleSite = (siteId: string) => {
        setForm((prev) => ({
            ...prev,
            siteIds: prev.siteIds.includes(siteId) ? prev.siteIds.filter((id) => id !== siteId) : [...prev.siteIds, siteId],
        }));
    };

    const toggleStudent = (id: string) => {
        setSelectedStudents((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
    };

    const toggleAll = () => {
        if (selectedStudents.length === filtered.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(filtered.map((s) => s.id));
        }
    };

    // Filter students
    let filtered = students.filter((s) => {
        const name = `${s.firstName} ${s.lastName}`.toLowerCase();
        if (search && !name.includes(search.toLowerCase())) return false;
        if (filterSite && !(s.sites || []).some((site: any) => site.id === filterSite)) return false;
        return true;
    });

    // Filter by subject if selected
    if (filterSubject) {
        filtered = filtered.filter((s) =>
            s.entries?.some((e: any) => e.subjectId === filterSubject) ||
            s.grades?.some((g: any) => g.subjectId === filterSubject) ||
            s.exams?.some((ex: any) => ex.subjectId === filterSubject)
        );
    }

    // Compute urgency
    const getUrgency = (student: any) => {
        if (student.archived) return "archived";
        const badGrades = student.grades?.filter((g: any) => g.value >= 4) || [];
        const upcomingExams = student.exams || [];
        const twoWeeksFromNow = new Date();
        twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
        const soonExams = upcomingExams.filter((e: any) => new Date(e.date) <= twoWeeksFromNow);

        if (badGrades.length > 0 && soonExams.length > 0) return "high";
        if (badGrades.length > 0 || soonExams.length > 0) return "medium";
        return "low";
    };

    if (loading) return <div className="loading-center"><div className="spinner"></div></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">🎓 Schüler</h1>
                <div className="flex gap-2 items-center">
                    <span className="badge badge-muted">{filtered.length} von {students.length}</span>
                    {role !== "TEACHER" && (
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Neuer Schüler</button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="filter-bar flex-wrap gap-2">
                <div className="search-bar flex-1" style={{ minWidth: "200px" }}>
                    <span className="search-bar-icon">🔍</span>
                    <input
                        className="input"
                        placeholder="Schüler suchen..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ paddingLeft: "2.5rem" }}
                    />
                </div>
                <select className="select" value={filterSite} onChange={(e) => setFilterSite(e.target.value)}>
                    <option value="">Alle Standorte</option>
                    {sites.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
                <select className="select" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
                    <option value="">Alle Fächer</option>
                    {subjects.map((sub: any) => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                </select>
                <label className="flex items-center gap-2 cursor-pointer border rounded-md px-3 py-2 bg-card hover:bg-muted/50 transition-colors">
                    <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
                    <span className="text-sm select-none">Archivierte anzeigen</span>
                </label>
                {selectedStudents.length > 0 && (
                    <button className="btn btn-outline btn-sm" onClick={() => router.push(`/dashboard/calendar?students=${selectedStudents.join(",")}`)}>
                        📅 Termine ({selectedStudents.length})
                    </button>
                )}
            </div>

            {/* Student Table */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: "40px" }}>
                                <input type="checkbox" checked={selectedStudents.length === filtered.length && filtered.length > 0} onChange={toggleAll} />
                            </th>
                            <th>Name</th>
                            <th>Standort(e)</th>
                            <th>Einträge</th>
                            <th>Status</th>
                            <th style={{ width: "100px" }}>Aktion</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((student) => {
                            const urgency = getUrgency(student);
                            const badGrades = student.grades?.filter((g: any) => g.value >= 4) || [];
                            const upcomingExams = student.exams || [];

                            return (
                                <tr key={student.id} className={`urgency-row-${urgency}`}>
                                    <td onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selectedStudents.includes(student.id)}
                                            onChange={() => toggleStudent(student.id)}
                                        />
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="cursor-pointer"
                                                onClick={() => router.push(`/dashboard/students/${student.id}`)}
                                            >
                                                <span className="font-semibold text-primary" style={{ cursor: "pointer" }}>
                                                    {student.firstName} {student.lastName}
                                                </span>
                                                {student.note && (
                                                    <p className="text-xs text-muted-foreground" style={{ marginTop: "2px" }}>
                                                        {student.note.length > 60 ? student.note.slice(0, 60) + "…" : student.note}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex gap-1 flex-wrap">
                                            {student.sites?.map((s: any) => (
                                                <span key={s.id} className="badge badge-muted" style={{ fontSize: "0.7rem" }}>{s.name}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="text-sm">{student._count?.entries || 0}</span>
                                    </td>
                                    <td>
                                        {urgency === "high" && <span className="badge badge-destructive">⚠ Dringend</span>}
                                        {urgency === "medium" && <span className="badge badge-warning">Beachten</span>}
                                        {urgency === "low" && <span className="badge badge-success">OK</span>}
                                        {badGrades.length > 0 && (
                                            <span className="text-xs text-destructive ml-2">
                                                {badGrades.length}× Note 4+
                                            </span>
                                        )}
                                        {upcomingExams.length > 0 && (
                                            <span className="text-xs text-warning ml-2">
                                                {upcomingExams.length} SA
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => router.push(`/dashboard/students/${student.id}`)}
                                        >
                                            Öffnen →
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {filtered.length === 0 && (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">🎓</div>
                        <p>Keine Schüler gefunden.</p>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Neuen Schüler anlegen</h2>
                        <div className="form-row mb-4">
                            <div className="form-group">
                                <label className="form-label">Vorname *</label>
                                <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nachname *</label>
                                <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Geburtsdatum</label>
                            <input className="input" type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Notiz</label>
                            <textarea className="textarea" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Allgemeine Notiz zum Schüler..." />
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Standorte</label>
                            <div className="flex flex-wrap gap-2">
                                {sites.map((site) => (
                                    <label key={site.id} className="checkbox-wrapper">
                                        <input type="checkbox" checked={form.siteIds.includes(site.id)} onChange={() => toggleSite(site.id)} />
                                        <span className="text-sm">{site.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Abbrechen</button>
                            <button className="btn btn-primary" onClick={handleCreate} disabled={!form.firstName || !form.lastName || saving}>
                                {saving ? "Erstelle..." : "Erstellen"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
