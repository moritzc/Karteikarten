"use client";

import { useEffect, useState } from "react";

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: "", color: "" });

    const colorOptions = [
        { value: "blue", label: "Blau" },
        { value: "red", label: "Rot" },
        { value: "green", label: "Grün" },
        { value: "purple", label: "Lila" },
        { value: "orange", label: "Orange" },
        { value: "teal", label: "Türkis" },
        { value: "pink", label: "Rosa" },
        { value: "yellow", label: "Gelb" },
    ];

    const loadData = () => {
        fetch("/api/subjects").then((r) => r.json()).then((data) => {
            setSubjects(Array.isArray(data) ? data : []);
            setLoading(false);
        });
    };

    useEffect(() => { loadData(); }, []);

    const handleCreate = async () => {
        await fetch("/api/subjects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        setForm({ name: "", color: "" });
        setShowModal(false);
        loadData();
    };

    if (loading) return <div className="loading-center"><div className="spinner"></div></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">📚 Fächer</h1>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Neues Fach</button>
            </div>

            <div className="grid grid-4">
                {subjects.map((sub) => (
                    <div key={sub.id} className="card card-hover">
                        <div className="flex items-center gap-3">
                            <div className="subject-dot" style={{ backgroundColor: sub.color || "hsl(var(--primary))", width: "1rem", height: "1rem" }} />
                            <h3 className="font-semibold">{sub.name}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {subjects.length === 0 && (
                <div className="card"><div className="empty-state">
                    <div className="empty-state-icon">📚</div>
                    <p>Keine Fächer definiert.</p>
                </div></div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Neues Fach erstellen</h2>
                        <div className="form-group mb-4">
                            <label className="form-label">Name *</label>
                            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="z.B. Mathematik" />
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Farbe</label>
                            <div className="flex flex-wrap gap-2">
                                {colorOptions.map((c) => (
                                    <button
                                        key={c.value}
                                        className={`btn btn-sm ${form.color === c.value ? "btn-primary" : "btn-outline"}`}
                                        onClick={() => setForm({ ...form, color: c.value })}
                                        style={{ minWidth: "5rem" }}
                                    >
                                        <span className="subject-dot" style={{ backgroundColor: c.value }} />
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Abbrechen</button>
                            <button className="btn btn-primary" onClick={handleCreate} disabled={!form.name}>Erstellen</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
