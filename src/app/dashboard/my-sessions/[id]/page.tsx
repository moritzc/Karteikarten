"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function SessionDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { data: userSession } = useSession();
    const userId = (userSession?.user as any)?.id;
    const [sessionData, setSessionData] = useState<any>(null);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeStudent, setActiveStudent] = useState<string | null>(null);
    const [entryForm, setEntryForm] = useState({
        subjectId: "",
        topic: "",
        notes: "",
        homework: "",
    });
    const [gradeForm, setGradeForm] = useState({ value: "3", subjectId: "", type: "Schularbeit" });
    const [examForm, setExamForm] = useState({ subjectId: "", date: "", description: "" });
    const [showGradeModal, setShowGradeModal] = useState(false);
    const [showExamModal, setShowExamModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingFor, setUploadingFor] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadData = () => {
        Promise.all([
            fetch(`/api/sessions/${id}`).then((r) => r.json()),
            fetch("/api/subjects").then((r) => r.json()),
        ]).then(([s, sub]) => {
            setSessionData(s);
            setSubjects(Array.isArray(sub) ? sub : []);
            if (s.subjects?.length > 0) setEntryForm((prev) => ({ ...prev, subjectId: s.subjects[0].id }));
            setLoading(false);
        });
    };

    useEffect(() => { loadData(); }, [id]);

    const handleSubmitEntry = async (studentId: string) => {
        setSaving(true);
        await fetch("/api/entries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                studentId,
                ...entryForm,
                lessonDate: sessionData?.date || new Date().toISOString(),
            }),
        });
        setEntryForm({ subjectId: sessionData?.subjects?.[0]?.id || "", topic: "", notes: "", homework: "" });
        setActiveStudent(null);
        setSaving(false);
        loadData();
    };

    const handleAddGrade = async (studentId: string) => {
        await fetch("/api/grades", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...gradeForm, studentId }),
        });
        setShowGradeModal(false);
        loadData();
    };

    const handleAddExam = async (studentId: string) => {
        await fetch("/api/exams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...examForm, studentId }),
        });
        setShowExamModal(false);
        loadData();
    };

    const handleFileUpload = async (file: File, entryId: string) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("entryId", entryId);
        await fetch("/api/upload", { method: "POST", body: formData });
        loadData();
    };

    const handleComplete = async () => {
        await fetch(`/api/sessions/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed: true }),
        });
        loadData();
    };

    if (loading) return <div className="loading-center"><div className="spinner"></div></div>;
    if (!sessionData) return <div className="card"><p>Sitzung nicht gefunden.</p></div>;

    return (
        <div className="animate-fade-in">
            <button className="btn btn-ghost mb-4" onClick={() => router.back()}>← Zurück</button>

            <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="page-title">
                        {sessionData.subjects?.map((sub: any) => sub.name).join(", ") || "Gruppe"} — {new Date(sessionData.date).toLocaleDateString("de-AT")}
                    </h1>
                    <div className="flex gap-2 mt-2">
                        <span className="badge badge-muted">{sessionData.site?.name}</span>
                        <span className={`badge ${sessionData.completed ? "badge-success" : "badge-warning"}`}>
                            {sessionData.completed ? "Abgeschlossen" : "Offen"}
                        </span>
                    </div>
                </div>
                {!sessionData.completed && (
                    <button className="btn btn-primary" onClick={handleComplete}>
                        ✓ Als abgeschlossen markieren
                    </button>
                )}
            </div>

            {sessionData.managerNote && <div className="post-it mb-6">{sessionData.managerNote}</div>}

            {/* Student cards */}
            <div className="flex flex-col gap-4">
                {sessionData.students?.map((student: any) => {
                    const isActive = activeStudent === student.id;
                    const lastEntries = student.entries || [];
                    const upcomingExams = student.exams || [];
                    const recentGrades = student.grades || [];
                    const badGrade = recentGrades.find((g: any) => g.value >= 4);

                    return (
                        <div key={student.id} className={`card ${badGrade && upcomingExams.length ? "urgency-high" : ""}`}>
                            {/* Student header with context */}
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold">{student.firstName} {student.lastName}</h3>
                                <div className="flex gap-2">
                                    <button className="btn btn-outline btn-sm" onClick={() => { setActiveStudent(student.id); setShowGradeModal(true); }}>
                                        Note
                                    </button>
                                    <button className="btn btn-outline btn-sm" onClick={() => { setActiveStudent(student.id); setShowExamModal(true); }}>
                                        SA-Termin
                                    </button>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => setActiveStudent(isActive ? null : student.id)}
                                    >
                                        {isActive ? "Schließen" : "✏️ Eintrag"}
                                    </button>
                                </div>
                            </div>

                            {/* Compact context info */}
                            <div className="flex flex-col gap-1 mb-3">
                                {lastEntries.length > 0 && (
                                    <div className="info-bar">
                                        <span>📖 Letztes Mal:</span>
                                        <strong>{lastEntries[0].subject?.name}</strong>
                                        <span>— {lastEntries[0].topic || "Kein Thema"}</span>
                                        <span className="text-xs">({lastEntries[0].teacher?.name}, {new Date(lastEntries[0].lessonDate).toLocaleDateString("de-AT")})</span>
                                    </div>
                                )}
                                {upcomingExams.length > 0 && (
                                    <div className="info-bar">
                                        <span>📅 Nächste SA:</span>
                                        {upcomingExams.slice(0, 2).map((ex: any) => (
                                            <span key={ex.id} className="badge badge-warning">
                                                {ex.subject?.name} am {new Date(ex.date).toLocaleDateString("de-AT")}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {recentGrades.length > 0 && (
                                    <div className="info-bar">
                                        <span>📊 Letzte Noten:</span>
                                        {recentGrades.slice(0, 5).map((g: any) => (
                                            <span key={g.id} className="flex items-center gap-1">
                                                <span className={`grade grade-${g.value}`}>{g.value}</span>
                                                <span className="text-xs">{g.subject?.name}</span>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Entry form (expandable) */}
                            {isActive && (
                                <div className="animate-slide-up" style={{ borderTop: "1px solid hsl(var(--border))", paddingTop: "1rem" }}>
                                    <h4 className="font-semibold mb-3">Neuer Eintrag für {student.firstName}</h4>
                                    <div className="form-row mb-3">
                                        <div className="form-group">
                                            <label className="form-label">Fach</label>
                                            <select className="select" value={entryForm.subjectId} onChange={(e) => setEntryForm({ ...entryForm, subjectId: e.target.value })}>
                                                <option value="">Wählen...</option>
                                                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Thema</label>
                                            <input className="input" value={entryForm.topic} onChange={(e) => setEntryForm({ ...entryForm, topic: e.target.value })} placeholder="Was wurde durchgenommen?" />
                                        </div>
                                    </div>
                                    <div className="form-group mb-3">
                                        <label className="form-label">Anmerkungen</label>
                                        <textarea className="textarea" value={entryForm.notes} onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })} placeholder="Zusätzliche Notizen..." />
                                    </div>
                                    <div className="form-group mb-3">
                                        <label className="form-label">Hausübung</label>
                                        <input className="input" value={entryForm.homework} onChange={(e) => setEntryForm({ ...entryForm, homework: e.target.value })} placeholder="Aufgegebene Hausübung..." />
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="btn btn-primary" onClick={() => handleSubmitEntry(student.id)} disabled={saving}>
                                            {saving ? "Speichere..." : "💾 Eintrag speichern"}
                                        </button>
                                        <button className="btn btn-secondary" onClick={() => setActiveStudent(null)}>Abbrechen</button>
                                    </div>
                                </div>
                            )}

                            {/* Recent entries with file upload */}
                            {lastEntries.length > 0 && !isActive && (
                                <div className="mt-2">
                                    <details>
                                        <summary className="text-sm text-muted-foreground cursor-pointer" style={{ listStyle: "none" }}>
                                            📜 {lastEntries.length} bisherige Einträge anzeigen
                                        </summary>
                                        <div className="flex flex-col gap-2 mt-2">
                                            {lastEntries.map((entry: any) => (
                                                <div key={entry.id} className="p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--secondary))" }}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            {entry.subject && <span className="badge badge-primary">{entry.subject.name}</span>}
                                                            <span className="text-xs text-muted-foreground">{new Date(entry.lessonDate).toLocaleDateString("de-AT")}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs text-muted-foreground">{entry.teacher?.name}</span>
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
                                                    {entry.topic && <p className="text-sm mt-1">{entry.topic}</p>}
                                                    {entry.notes && <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>}
                                                    {entry.files?.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {entry.files.map((f: any) => (
                                                                <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="file-item">
                                                                    <span className="file-item-icon">📎</span>
                                                                    <span className="truncate" style={{ maxWidth: "120px" }}>{f.name}</span>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Hidden file input */}
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

            {/* Grade Modal */}
            {showGradeModal && activeStudent && (
                <div className="modal-overlay" onClick={() => setShowGradeModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Note eintragen</h2>
                        <div className="form-row mb-4">
                            <div className="form-group">
                                <label className="form-label">Note (1-5)</label>
                                <select className="select" value={gradeForm.value} onChange={(e) => setGradeForm({ ...gradeForm, value: e.target.value })}>
                                    {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Fach</label>
                                <select className="select" value={gradeForm.subjectId} onChange={(e) => setGradeForm({ ...gradeForm, subjectId: e.target.value })}>
                                    <option value="">Wählen...</option>
                                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Art</label>
                            <select className="select" value={gradeForm.type} onChange={(e) => setGradeForm({ ...gradeForm, type: e.target.value })}>
                                <option value="Schularbeit">Schularbeit</option>
                                <option value="Test">Test</option>
                                <option value="Mitarbeit">Mitarbeit</option>
                                <option value="Hausübung">Hausübung</option>
                            </select>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowGradeModal(false)}>Abbrechen</button>
                            <button className="btn btn-primary" onClick={() => handleAddGrade(activeStudent)} disabled={!gradeForm.subjectId}>Speichern</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Exam Modal */}
            {showExamModal && activeStudent && (
                <div className="modal-overlay" onClick={() => setShowExamModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Schularbeitstermin eintragen</h2>
                        <div className="form-row mb-4">
                            <div className="form-group">
                                <label className="form-label">Fach</label>
                                <select className="select" value={examForm.subjectId} onChange={(e) => setExamForm({ ...examForm, subjectId: e.target.value })}>
                                    <option value="">Wählen...</option>
                                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Datum</label>
                                <input className="input" type="date" value={examForm.date} onChange={(e) => setExamForm({ ...examForm, date: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Beschreibung</label>
                            <input className="input" value={examForm.description} onChange={(e) => setExamForm({ ...examForm, description: e.target.value })} placeholder="z.B. Kapitel 1-3" />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowExamModal(false)}>Abbrechen</button>
                            <button className="btn btn-primary" onClick={() => handleAddExam(activeStudent)} disabled={!examForm.subjectId || !examForm.date}>Speichern</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
