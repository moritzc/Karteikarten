"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const CONTACT_TYPE_LABELS: Record<string, string> = {
    GUARDIAN_PHONE: "📱 Eltern Tel.",
    GUARDIAN_EMAIL: "📧 Eltern E-Mail",
    STUDENT_PHONE: "📱 Schüler Tel.",
    STUDENT_EMAIL: "📧 Schüler E-Mail",
};

export default function StudentDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const role = (session?.user as any)?.role;
    const canEditMaster = role === "ADMIN" || role === "SITE_MANAGER";

    const [student, setStudent] = useState<any>(null);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterSubject, setFilterSubject] = useState("");
    const [tab, setTab] = useState<"info" | "entries" | "grades" | "zeugnis" | "exams">("info");
    const [showGradeModal, setShowGradeModal] = useState(false);
    const [showExamModal, setShowExamModal] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [previewFile, setPreviewFile] = useState<any>(null);

    const [gradeForm, setGradeForm] = useState({ value: "3", subjectId: "", type: "Schularbeit", date: "" });
    const [examForm, setExamForm] = useState({ subjectId: "", date: "", description: "" });
    const [contactForm, setContactForm] = useState({ type: "GUARDIAN_PHONE", value: "", label: "" });
    const [masterForm, setMasterForm] = useState({
        firstName: "", lastName: "", birthDate: "", note: "",
        guardianName: "", school: "", gradeLevel: "", siteIds: [] as string[],
    });

    // Zeugnisnoten state
    const [zeugnisYear, setZeugnisYear] = useState("");
    const [zeugnisSemester, setZeugnisSemester] = useState(1);

    const loadData = () => {
        Promise.all([
            fetch(`/api/students/${id}`).then((r) => r.json()),
            fetch("/api/subjects").then((r) => r.json()),
            fetch("/api/sites").then((r) => r.json()),
        ]).then(([s, sub, si]) => {
            setStudent(s);
            setSubjects(Array.isArray(sub) ? sub : []);
            setSites(Array.isArray(si) ? si : []);
            if (s && !zeugnisYear) {
                // Default school year
                const now = new Date();
                const y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
                setZeugnisYear(`${y}/${(y + 1).toString().slice(2)}`);
            }
            setLoading(false);
        });
    };

    useEffect(() => { loadData(); }, [id]);

    const startEdit = () => {
        if (!student) return;
        setMasterForm({
            firstName: student.firstName || "",
            lastName: student.lastName || "",
            birthDate: student.birthDate ? student.birthDate.slice(0, 10) : "",
            note: student.note || "",
            guardianName: student.guardianName || "",
            school: student.school || "",
            gradeLevel: student.gradeLevel || "",
            siteIds: student.sites?.map((s: any) => s.id) || [],
        });
        setEditMode(true);
    };

    const handleSaveMaster = async () => {
        setSaving(true);
        await fetch(`/api/students/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(masterForm),
        });
        setEditMode(false);
        setSaving(false);
        loadData();
    };

    const handleAddGrade = async () => {
        await fetch("/api/grades", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...gradeForm, studentId: id }),
        });
        setShowGradeModal(false);
        loadData();
    };

    const handleAddExam = async () => {
        await fetch("/api/exams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...examForm, studentId: id }),
        });
        setShowExamModal(false);
        loadData();
    };

    const handleAddContact = async () => {
        await fetch("/api/student-contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...contactForm, studentId: id }),
        });
        setContactForm({ type: "GUARDIAN_PHONE", value: "", label: "" });
        setShowContactModal(false);
        loadData();
    };

    const handleDeleteContact = async (contactId: string) => {
        await fetch(`/api/student-contacts?id=${contactId}`, { method: "DELETE" });
        loadData();
    };

    const handleSaveZeugnis = async (subjectId: string, value: string) => {
        if (!value) return;
        await fetch("/api/report-grades", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                studentId: id,
                subjectId,
                value: parseInt(value),
                schoolYear: zeugnisYear,
                semester: zeugnisSemester,
            }),
        });
        loadData();
    };

    const handleArchive = async () => {
        if (!student) return;
        const newStatus = !student.archived;
        const action = newStatus ? "archivieren" : "wiederherstellen";
        if (!confirm(`Möchten Sie den Schüler "${student.firstName} ${student.lastName}" wirklich ${action}?`)) return;

        const res = await fetch(`/api/students/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ archived: newStatus }),
        });

        if (res.ok) {
            loadData();
        } else {
            alert("Fehler beim Ändern des Archiv-Status.");
        }
    };

    const handleDelete = async () => {
        if (!student) return;
        if (!confirm(`ACHTUNG: Möchten Sie den Schüler "${student.firstName} ${student.lastName}" UNWIDERRUFLICH LÖSCHEN?\n\nAlle Daten (Noten, Einträge, Dateien) gehen verloren!`)) return;

        const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
        if (res.ok) {
            router.push("/dashboard/students");
        } else {
            alert("Fehler beim Löschen.");
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetType: "student" | "entry", targetId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setUploadError("");
        try {
            const formData = new FormData();
            formData.append("file", file);
            if (targetType === "student") formData.append("studentId", targetId);
            if (targetType === "entry") formData.append("entryId", targetId);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (!res.ok) {
                const err = await res.json();
                setUploadError(err.error || "Upload fehlgeschlagen");
            }
        } catch (err: any) {
            setUploadError("Upload fehlgeschlagen: " + err.message);
        }
        setUploading(false);
        loadData();
        e.target.value = ""; // Reset input
    };

    const handleDeleteFile = async (fileId: string) => {
        if (!confirm("Datei wirklich löschen?")) return;
        await fetch(`/api/upload?id=${fileId}`, { method: "DELETE" });
        loadData();
    };

    const getFileIcon = (type?: string, name?: string) => {
        if (type?.includes("pdf")) return "📄";
        if (type?.includes("image")) return "🖼️";
        if (type?.includes("word") || name?.endsWith(".docx")) return "📝";
        if (type?.includes("excel") || type?.includes("spreadsheet")) return "📊";
        return "📎";
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    if (loading) return <div className="loading-center"><div className="spinner"></div></div>;
    if (!student) return <div className="card"><p>Schüler nicht gefunden.</p></div>;

    const filteredEntries = filterSubject
        ? student.entries?.filter((e: any) => e.subjectId === filterSubject)
        : student.entries;

    const filteredGrades = filterSubject
        ? student.grades?.filter((g: any) => g.subjectId === filterSubject)
        : student.grades;

    const filteredExams = filterSubject
        ? student.exams?.filter((ex: any) => ex.subjectId === filterSubject)
        : student.exams;

    // Get Zeugnisnoten for current year/semester
    const currentZeugnis = student.reportCardGrades?.filter(
        (rg: any) => rg.schoolYear === zeugnisYear && rg.semester === zeugnisSemester
    ) || [];

    return (
        <div className="animate-fade-in">
            <button className="btn btn-ghost mb-4" onClick={() => router.back()}>← Zurück</button>

            <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="page-title">
                        {student.firstName} {student.lastName}
                        {student.archived && <span className="ml-2 badge badge-warning text-sm align-middle" style={{ fontSize: "0.8rem" }}>Archiviert</span>}
                    </h1>
                    <div className="flex gap-2 mt-2 flex-wrap">
                        {student.sites?.map((s: any) => <span key={s.id} className="badge badge-primary">{s.name}</span>)}
                        {student.school && <span className="badge badge-muted">🏫 {student.school}</span>}
                        {student.gradeLevel && <span className="badge badge-muted">📖 {student.gradeLevel}</span>}
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button className="btn btn-primary btn-sm" onClick={() => setShowGradeModal(true)}>+ Note</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setShowExamModal(true)}>+ Schularbeit</button>
                    {canEditMaster && (
                        <>
                            <button className="btn btn-secondary btn-sm" onClick={startEdit}>✏️ Stammdaten</button>
                            <button className="btn btn-outline btn-sm" onClick={handleArchive}>
                                {student.archived ? "📂 Wiederherstellen" : "📂 Archivieren"}
                            </button>
                            <button className="btn btn-outline btn-sm" onClick={() => {
                                const link = document.createElement("a");
                                link.href = `/api/export/student?studentId=${id}`;
                                link.download = `export-${student.firstName}-${student.lastName}.json`;
                                link.click();
                            }}>📦 Export</button>
                            <button className="btn btn-ghost btn-sm" title="Export mit anonymisierten Lehrkräften" onClick={() => {
                                const link = document.createElement("a");
                                link.href = `/api/export/student?studentId=${id}&anonymizeTeachers=true`;
                                link.download = `export-${student.firstName}-${student.lastName}-anonym.json`;
                                link.click();
                            }}>🔒 Anonym</button>
                            <button className="btn btn-ghost btn-sm text-destructive" onClick={handleDelete} title="Schüler löschen">🗑️</button>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab ${tab === "info" ? "active" : ""}`} onClick={() => setTab("info")}>
                    Stammdaten
                </button>
                <button className={`tab ${tab === "entries" ? "active" : ""}`} onClick={() => setTab("entries")}>
                    Einträge ({filteredEntries?.length || 0})
                </button>
                <button className={`tab ${tab === "grades" ? "active" : ""}`} onClick={() => setTab("grades")}>
                    Noten ({filteredGrades?.length || 0})
                </button>
                <button className={`tab ${tab === "zeugnis" ? "active" : ""}`} onClick={() => setTab("zeugnis")}>
                    Zeugnisnoten
                </button>
                <button className={`tab ${tab === "exams" ? "active" : ""}`} onClick={() => setTab("exams")}>
                    Schularbeiten ({filteredExams?.length || 0})
                </button>
            </div>

            {/* Filter — show on entries/grades/exams tabs */}
            {(tab === "entries" || tab === "grades" || tab === "exams") && (
                <div className="filter-bar">
                    <select className="select" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
                        <option value="">Alle Fächer</option>
                        {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            )}

            {/* ===== INFO TAB ===== */}
            {tab === "info" && (
                <div className="grid grid-2">
                    {/* Personal Info Card */}
                    <div className="card">
                        <h3 className="card-title mb-4">👤 Persönliche Daten</h3>
                        <div className="flex flex-col gap-3">
                            <div className="info-bar">
                                <strong>Name:</strong> {student.firstName} {student.lastName}
                            </div>
                            {student.birthDate && (
                                <div className="info-bar">
                                    <strong>Geburtsdatum:</strong> {new Date(student.birthDate).toLocaleDateString("de-AT")}
                                </div>
                            )}
                            {student.guardianName && (
                                <div className="info-bar">
                                    <strong>Erziehungsberechtigte:</strong> {student.guardianName}
                                </div>
                            )}
                            {student.school && (
                                <div className="info-bar">
                                    <strong>Schule:</strong> {student.school}
                                </div>
                            )}
                            {student.gradeLevel && (
                                <div className="info-bar">
                                    <strong>Schulstufe:</strong> {student.gradeLevel}
                                </div>
                            )}
                            {student.note && (
                                <div className="post-it" style={{ transform: "none" }}>
                                    {student.note}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Contacts Card */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="card-title mb-0">📞 Kontaktdaten</h3>
                            {canEditMaster && (
                                <button className="btn btn-primary btn-sm" onClick={() => setShowContactModal(true)}>
                                    + Kontakt
                                </button>
                            )}
                        </div>
                        {student.contacts?.length === 0 ? (
                            <div className="empty-state" style={{ padding: "1.5rem" }}>
                                <p className="text-sm">Keine Kontaktdaten hinterlegt.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {student.contacts?.map((c: any) => (
                                    <div key={c.id} className="info-bar justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs" style={{ opacity: 0.7 }}>
                                                {CONTACT_TYPE_LABELS[c.type] || c.type}
                                            </span>
                                            {c.label && <span className="badge badge-muted">{c.label}</span>}
                                            <strong>{c.value}</strong>
                                        </div>
                                        {canEditMaster && (
                                            <button
                                                className="btn btn-ghost btn-sm text-destructive"
                                                onClick={() => handleDeleteContact(c.id)}
                                                style={{ padding: "0.2rem 0.4rem" }}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Site Assignments */}
                    <div className="card">
                        <h3 className="card-title mb-4">🏢 Standorte</h3>
                        <div className="flex flex-wrap gap-2">
                            {student.sites?.map((s: any) => (
                                <span key={s.id} className="chip">{s.name}</span>
                            ))}
                            {student.sites?.length === 0 && (
                                <p className="text-sm text-muted-foreground">Keinem Standort zugewiesen.</p>
                            )}
                        </div>
                    </div>

                    {/* Direct File Attachments */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="card-title mb-0">📎 Dateien</h3>
                            <label className="btn btn-primary btn-sm" style={{ cursor: "pointer" }}>
                                {uploading ? "Lädt hoch..." : "+ Datei hochladen"}
                                <input
                                    type="file"
                                    style={{ display: "none" }}
                                    onChange={(e) => handleFileUpload(e, "student", id as string)}
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                        {uploadError && <p className="text-sm text-destructive mb-3">⚠ {uploadError}</p>}
                        {student.files?.length === 0 ? (
                            <div className="empty-state" style={{ padding: "1.5rem" }}>
                                <p className="text-sm">Keine Dateien angeheftet. Klicke auf "Datei hochladen" um Dokumente hinzuzufügen.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {student.files?.map((f: any) => (
                                    <div key={f.id} className="info-bar justify-between" style={{ padding: "0.5rem 0.75rem" }}>
                                        <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
                                            <span style={{ fontSize: "1.2rem" }}>{getFileIcon(f.type, f.name)}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div className="font-semibold text-sm" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                                                <div className="text-xs text-muted-foreground">{formatFileSize(f.size)} · {new Date(f.createdAt).toLocaleDateString("de-AT")}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            {/* PDF Preview */}
                                            {f.type?.includes("pdf") && (
                                                <button className="btn btn-outline btn-sm" onClick={() => setPreviewFile(f)} title="Vorschau">👁️</button>
                                            )}
                                            {/* Download */}
                                            <a href={f.url} download={f.name} className="btn btn-outline btn-sm" title="Herunterladen">⬇️</a>
                                            {/* Delete */}
                                            {canEditMaster && (
                                                <button className="btn btn-ghost btn-sm text-destructive" onClick={() => handleDeleteFile(f.id)} title="Löschen">✕</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ===== ENTRIES TAB ===== */}
            {tab === "entries" && (
                <div className="flex flex-col gap-3">
                    {filteredEntries?.length === 0 && (
                        <div className="empty-state"><p>Keine Einträge.</p></div>
                    )}
                    {filteredEntries?.map((entry: any) => (
                        <div key={entry.id} className="card card-hover">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    {entry.subject && <span className="badge badge-primary">{entry.subject.name}</span>}
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(entry.lessonDate).toLocaleDateString("de-AT")}
                                    </span>
                                </div>
                                <span className="text-xs text-muted-foreground">von {entry.teacher?.name || "Gelöscht"}</span>
                            </div>
                            {entry.topic && <p className="text-sm font-medium mb-1">{entry.topic}</p>}
                            {entry.notes && <p className="text-sm text-muted-foreground mb-1">{entry.notes}</p>}
                            {entry.homework && <p className="text-sm"><span className="font-medium">Hausübung:</span> {entry.homework}</p>}
                            {entry.files?.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {entry.files.map((f: any) => (
                                        <div key={f.id} className="flex items-center gap-1">
                                            <a href={f.url} download={f.name} className="file-item" title="Herunterladen">
                                                <span className="file-item-icon">{getFileIcon(f.type, f.name)}</span>
                                                <span className="truncate" style={{ maxWidth: "150px" }}>{f.name}</span>
                                            </a>
                                            {f.type?.includes("pdf") && (
                                                <button className="btn btn-ghost btn-sm" onClick={() => setPreviewFile(f)} style={{ padding: "0.15rem 0.3rem", fontSize: "0.75rem" }}>👁️</button>
                                            )}
                                        </div>
                                    ))}
                                    <label className="file-item" style={{ cursor: "pointer", opacity: 0.6 }} title="Datei anhängen">
                                        <span className="file-item-icon">➕</span>
                                        <span className="text-xs">Datei</span>
                                        <input type="file" style={{ display: "none" }} onChange={(e) => handleFileUpload(e, "entry", entry.id)} />
                                    </label>
                                </div>
                            )}
                            {(!entry.files || entry.files.length === 0) && (
                                <label className="file-item mt-2" style={{ cursor: "pointer", opacity: 0.5 }} title="Datei anhängen">
                                    <span className="file-item-icon">📎</span>
                                    <span className="text-xs">Datei anhängen</span>
                                    <input type="file" style={{ display: "none" }} onChange={(e) => handleFileUpload(e, "entry", entry.id)} />
                                </label>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ===== GRADES TAB ===== */}
            {tab === "grades" && (
                <div className="table-container">
                    <table className="table">
                        <thead><tr><th>Datum</th><th>Fach</th><th>Note</th><th>Art</th></tr></thead>
                        <tbody>
                            {filteredGrades?.map((g: any) => (
                                <tr key={g.id}>
                                    <td>{new Date(g.date).toLocaleDateString("de-AT")}</td>
                                    <td>{g.subject?.name}</td>
                                    <td><span className={`grade grade-${g.value}`}>{g.value}</span></td>
                                    <td>{g.type || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredGrades?.length === 0 && <div className="empty-state"><p>Keine Noten.</p></div>}
                </div>
            )}

            {/* ===== ZEUGNISNOTEN TAB ===== */}
            {tab === "zeugnis" && (
                <div>
                    {/* Year/Semester selector */}
                    <div className="filter-bar">
                        <div className="form-group">
                            <label className="form-label">Schuljahr</label>
                            <input
                                className="input"
                                value={zeugnisYear}
                                onChange={(e) => setZeugnisYear(e.target.value)}
                                placeholder="z.B. 2025/26"
                                style={{ maxWidth: "140px" }}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Semester</label>
                            <select className="select" value={zeugnisSemester} onChange={(e) => setZeugnisSemester(parseInt(e.target.value))} style={{ maxWidth: "180px" }}>
                                <option value={1}>1. Semester</option>
                                <option value={2}>2. Semester (Jahreszeugnis)</option>
                            </select>
                        </div>
                    </div>

                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Fach</th>
                                    <th>Note</th>
                                    <th style={{ width: "120px" }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {subjects.map((subject) => {
                                    const existing = currentZeugnis.find((rg: any) => rg.subjectId === subject.id);
                                    return (
                                        <tr key={subject.id}>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    {subject.color && <span className="subject-dot" style={{ backgroundColor: subject.color }}></span>}
                                                    {subject.name}
                                                </div>
                                            </td>
                                            <td>
                                                {existing ? (
                                                    <span className={`grade grade-${existing.value}`}>{existing.value}</span>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">—</span>
                                                )}
                                            </td>
                                            <td>
                                                <select
                                                    className="select"
                                                    value={existing?.value || ""}
                                                    onChange={(e) => handleSaveZeugnis(subject.id, e.target.value)}
                                                    style={{ maxWidth: "80px", height: "2rem", fontSize: "0.8rem" }}
                                                >
                                                    <option value="">—</option>
                                                    {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Nur Fächer mit eingetragener Note werden in der Übersicht angezeigt.
                        Änderungen werden sofort gespeichert.
                    </p>
                </div>
            )}

            {/* ===== EXAMS TAB ===== */}
            {tab === "exams" && (
                <div className="table-container">
                    <table className="table">
                        <thead><tr><th>Datum</th><th>Fach</th><th>Beschreibung</th></tr></thead>
                        <tbody>
                            {filteredExams?.map((ex: any) => (
                                <tr key={ex.id}>
                                    <td>
                                        {new Date(ex.date).toLocaleDateString("de-AT")}
                                        {new Date(ex.date) < new Date() && <span className="badge badge-muted" style={{ marginLeft: "0.5rem" }}>Vergangen</span>}
                                    </td>
                                    <td>{ex.subject?.name}</td>
                                    <td>{ex.description || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredExams?.length === 0 && <div className="empty-state"><p>Keine Schularbeiten.</p></div>}
                </div>
            )}

            {/* ===== GRADE MODAL ===== */}
            {showGradeModal && (
                <div className="modal-overlay" onClick={() => setShowGradeModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Note eintragen</h2>
                        <div className="form-row mb-4">
                            <div className="form-group">
                                <label className="form-label">Note (1-5) *</label>
                                <select className="select" value={gradeForm.value} onChange={(e) => setGradeForm({ ...gradeForm, value: e.target.value })}>
                                    {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Fach *</label>
                                <select className="select" value={gradeForm.subjectId} onChange={(e) => setGradeForm({ ...gradeForm, subjectId: e.target.value })}>
                                    <option value="">Wählen...</option>
                                    {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-row mb-4">
                            <div className="form-group">
                                <label className="form-label">Art</label>
                                <select className="select" value={gradeForm.type} onChange={(e) => setGradeForm({ ...gradeForm, type: e.target.value })}>
                                    <option value="Schularbeit">Schularbeit</option>
                                    <option value="Test">Test</option>
                                    <option value="Mitarbeit">Mitarbeit</option>
                                    <option value="Hausübung">Hausübung</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Datum</label>
                                <input className="input" type="date" value={gradeForm.date} onChange={(e) => setGradeForm({ ...gradeForm, date: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowGradeModal(false)}>Abbrechen</button>
                            <button className="btn btn-primary" onClick={handleAddGrade} disabled={!gradeForm.subjectId}>Speichern</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== EXAM MODAL ===== */}
            {showExamModal && (
                <div className="modal-overlay" onClick={() => setShowExamModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Schularbeit eintragen</h2>
                        <div className="form-row mb-4">
                            <div className="form-group">
                                <label className="form-label">Fach *</label>
                                <select className="select" value={examForm.subjectId} onChange={(e) => setExamForm({ ...examForm, subjectId: e.target.value })}>
                                    <option value="">Wählen...</option>
                                    {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Datum *</label>
                                <input className="input" type="date" value={examForm.date} onChange={(e) => setExamForm({ ...examForm, date: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Beschreibung</label>
                            <input className="input" value={examForm.description} onChange={(e) => setExamForm({ ...examForm, description: e.target.value })} placeholder="z.B. Kapitel 1-3" />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowExamModal(false)}>Abbrechen</button>
                            <button className="btn btn-primary" onClick={handleAddExam} disabled={!examForm.subjectId || !examForm.date}>Speichern</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== CONTACT MODAL ===== */}
            {showContactModal && (
                <div className="modal-overlay" onClick={() => setShowContactModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Kontakt hinzufügen</h2>
                        <div className="form-group mb-4">
                            <label className="form-label">Art *</label>
                            <select className="select" value={contactForm.type} onChange={(e) => setContactForm({ ...contactForm, type: e.target.value })}>
                                <option value="GUARDIAN_PHONE">📱 Eltern Telefon</option>
                                <option value="GUARDIAN_EMAIL">📧 Eltern E-Mail</option>
                                <option value="STUDENT_PHONE">📱 Schüler Telefon</option>
                                <option value="STUDENT_EMAIL">📧 Schüler E-Mail</option>
                            </select>
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Wert *</label>
                            <input
                                className="input"
                                value={contactForm.value}
                                onChange={(e) => setContactForm({ ...contactForm, value: e.target.value })}
                                placeholder={contactForm.type.includes("PHONE") ? "+43 660 1234567" : "email@example.com"}
                            />
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Bezeichnung (optional)</label>
                            <input
                                className="input"
                                value={contactForm.label}
                                onChange={(e) => setContactForm({ ...contactForm, label: e.target.value })}
                                placeholder="z.B. Mutter, Vater, privat"
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowContactModal(false)}>Abbrechen</button>
                            <button className="btn btn-primary" onClick={handleAddContact} disabled={!contactForm.value}>Speichern</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== EDIT MASTER DATA MODAL ===== */}
            {editMode && (
                <div className="modal-overlay" onClick={() => setEditMode(false)}>
                    <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Stammdaten bearbeiten</h2>
                        <div className="form-row mb-4">
                            <div className="form-group">
                                <label className="form-label">Vorname *</label>
                                <input className="input" value={masterForm.firstName} onChange={(e) => setMasterForm({ ...masterForm, firstName: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nachname *</label>
                                <input className="input" value={masterForm.lastName} onChange={(e) => setMasterForm({ ...masterForm, lastName: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-row mb-4">
                            <div className="form-group">
                                <label className="form-label">Geburtsdatum</label>
                                <input className="input" type="date" value={masterForm.birthDate} onChange={(e) => setMasterForm({ ...masterForm, birthDate: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Erziehungsberechtigte</label>
                                <input className="input" value={masterForm.guardianName} onChange={(e) => setMasterForm({ ...masterForm, guardianName: e.target.value })} placeholder="z.B. Maria Mustermann" />
                            </div>
                        </div>
                        <div className="form-row mb-4">
                            <div className="form-group">
                                <label className="form-label">Schule</label>
                                <input className="input" value={masterForm.school} onChange={(e) => setMasterForm({ ...masterForm, school: e.target.value })} placeholder="z.B. BG/BRG Musterstadt" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Schulstufe</label>
                                <input className="input" value={masterForm.gradeLevel} onChange={(e) => setMasterForm({ ...masterForm, gradeLevel: e.target.value })} placeholder="z.B. 5. Klasse" />
                            </div>
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Notiz</label>
                            <textarea className="textarea" value={masterForm.note} onChange={(e) => setMasterForm({ ...masterForm, note: e.target.value })} placeholder="Allgemeine Notiz zum Schüler" />
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Standorte</label>
                            <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", padding: "0.5rem" }}>
                                {sites.map((site) => (
                                    <label key={site.id} className="checkbox-wrapper" style={{ padding: "0.375rem 0.5rem" }}>
                                        <input
                                            type="checkbox"
                                            checked={masterForm.siteIds.includes(site.id)}
                                            onChange={() => {
                                                setMasterForm((prev) => ({
                                                    ...prev,
                                                    siteIds: prev.siteIds.includes(site.id)
                                                        ? prev.siteIds.filter((id) => id !== site.id)
                                                        : [...prev.siteIds, site.id],
                                                }));
                                            }}
                                        />
                                        <span className="text-sm">{site.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setEditMode(false)}>Abbrechen</button>
                            <button className="btn btn-primary" onClick={handleSaveMaster} disabled={!masterForm.firstName || !masterForm.lastName || saving}>
                                {saving ? "Speichere..." : "Speichern"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== PDF PREVIEW MODAL ===== */}
            {previewFile && (
                <div className="modal-overlay" onClick={() => setPreviewFile(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "900px", width: "95vw", height: "85vh", display: "flex", flexDirection: "column" }}>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="modal-title mb-0">{previewFile.name}</h2>
                            <div className="flex gap-2">
                                <a href={previewFile.url} download={previewFile.name} className="btn btn-outline btn-sm">⬇️ Herunterladen</a>
                                <button className="btn btn-ghost btn-sm" onClick={() => setPreviewFile(null)}>✕</button>
                            </div>
                        </div>
                        <iframe
                            src={previewFile.url}
                            style={{ flex: 1, border: "none", borderRadius: "var(--radius)" }}
                            title={previewFile.name}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
