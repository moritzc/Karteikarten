"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";

export default function EntriesPage() {
    const { data: session } = useSession();
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role;
    const [entries, setEntries] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterSubject, setFilterSubject] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ topic: "", notes: "", homework: "", subjectId: "" });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingFor, setUploadingFor] = useState<string | null>(null);

    const loadData = () => {
        const params = role === "TEACHER" ? `?teacherId=${userId}` : "";
        Promise.all([
            fetch(`/api/entries${params}`).then((r) => r.json()),
            fetch("/api/subjects").then((r) => r.json()),
        ]).then(([e, s]) => {
            setEntries(Array.isArray(e) ? e : []);
            setSubjects(Array.isArray(s) ? s : []);
            setLoading(false);
        });
    };

    useEffect(() => { loadData(); }, [userId]);

    const startEdit = (entry: any) => {
        setEditingId(entry.id);
        setEditForm({
            topic: entry.topic || "",
            notes: entry.notes || "",
            homework: entry.homework || "",
            subjectId: entry.subjectId || "",
        });
    };

    const handleUpdate = async () => {
        await fetch(`/api/entries/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editForm),
        });
        setEditingId(null);
        loadData();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Eintrag wirklich löschen?")) return;
        await fetch(`/api/entries/${id}`, { method: "DELETE" });
        loadData();
    };

    const handleFileUpload = async (file: File, entryId: string) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("entryId", entryId);
        await fetch("/api/upload", { method: "POST", body: formData });
        loadData();
    };

    const filtered = filterSubject
        ? entries.filter((e) => e.subjectId === filterSubject)
        : entries;

    if (loading) return <div className="loading-center"><div className="spinner"></div></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">✏️ {role === "TEACHER" ? "Meine " : ""}Einträge</h1>
            </div>

            <div className="filter-bar">
                <select className="select" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
                    <option value="">Alle Fächer</option>
                    {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <span className="badge badge-primary">{filtered.length} Einträge</span>
            </div>

            <div className="flex flex-col gap-3">
                {filtered.map((entry) => (
                    <div key={entry.id} className="card card-hover">
                        {editingId === entry.id ? (
                            /* Edit mode */
                            <div className="animate-fade-in">
                                <div className="form-row mb-3">
                                    <div className="form-group">
                                        <label className="form-label">Fach</label>
                                        <select className="select" value={editForm.subjectId} onChange={(e) => setEditForm({ ...editForm, subjectId: e.target.value })}>
                                            <option value="">Wählen...</option>
                                            {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Thema</label>
                                        <input className="input" value={editForm.topic} onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-group mb-3">
                                    <label className="form-label">Anmerkungen</label>
                                    <textarea className="textarea" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                                </div>
                                <div className="form-group mb-3">
                                    <label className="form-label">Hausübung</label>
                                    <input className="input" value={editForm.homework} onChange={(e) => setEditForm({ ...editForm, homework: e.target.value })} />
                                </div>
                                <div className="flex gap-2">
                                    <button className="btn btn-primary btn-sm" onClick={handleUpdate}>💾 Speichern</button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Abbrechen</button>
                                </div>
                            </div>
                        ) : (
                            /* View mode */
                            <>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">{entry.student?.firstName} {entry.student?.lastName}</span>
                                        {entry.subject && <span className="badge badge-primary">{entry.subject.name}</span>}
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(entry.lessonDate).toLocaleDateString("de-AT")}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-muted-foreground mr-2">von {entry.teacher?.name}</span>
                                        {(role !== "TEACHER" || entry.teacherId === userId) && (
                                            <>
                                                <button className="btn btn-ghost btn-sm" onClick={() => startEdit(entry)}>✏️</button>
                                                <button className="btn btn-ghost btn-sm text-destructive" onClick={() => handleDelete(entry.id)}>🗑</button>
                                            </>
                                        )}
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => {
                                                setUploadingFor(entry.id);
                                                fileInputRef.current?.click();
                                            }}
                                        >
                                            📎
                                        </button>
                                    </div>
                                </div>
                                {entry.topic && <p className="text-sm font-medium">{entry.topic}</p>}
                                {entry.notes && <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>}
                                {entry.homework && <p className="text-sm mt-1"><strong>HÜ:</strong> {entry.homework}</p>}
                                {entry.files?.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {entry.files.map((f: any) => (
                                            <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="file-item">
                                                <span className="file-item-icon">
                                                    {f.type?.includes("image") ? "🖼️" : f.type?.includes("pdf") ? "📄" : "📎"}
                                                </span>
                                                <span className="truncate" style={{ maxWidth: "150px" }}>{f.name}</span>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="card"><div className="empty-state">
                    <div className="empty-state-icon">✏️</div>
                    <p>Keine Einträge vorhanden.</p>
                </div></div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                accept="image/*,.pdf,.doc,.docx"
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file && uploadingFor) {
                        await handleFileUpload(file, uploadingFor);
                        setUploadingFor(null);
                    }
                    e.target.value = "";
                }}
            />
        </div>
    );
}
