"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TeacherNotesPage() {
    const router = useRouter();
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState("30"); // days

    useEffect(() => {
        loadNotes();
    }, [range]);

    const loadNotes = async () => {
        setLoading(true);
        // Calculate date from range
        const d = new Date();
        d.setDate(d.getDate() - parseInt(range));
        const dateStr = d.toISOString().slice(0, 10);

        // Fetch all notes (done and not done) from date
        const res = await fetch(`/api/teacher-notes?from=${dateStr}`);
        const data = await res.json();
        setNotes(Array.isArray(data) ? data : []);
        setLoading(false);
    };

    const markNoteDone = async (id: string, currentStatus: boolean) => {
        const res = await fetch(`/api/teacher-notes/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isDone: !currentStatus }),
        });
        if (res.ok) {
            setNotes((prev) => prev.map((n) => n.id === id ? { ...n, isDone: !currentStatus } : n));
        }
    };

    if (loading) return <div className="loading-center"><div className="spinner"></div></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📨 Alle Nachrichten</h1>
                    <p className="text-muted-foreground">Übersicht aller Nachrichten von Lehrkräften.</p>
                </div>
                <div className="flex gap-2 items-center">
                    <label className="text-sm">Zeitraum:</label>
                    <select className="select" value={range} onChange={(e) => setRange(e.target.value)} style={{ width: "auto" }}>
                        <option value="7">Letzte 7 Tage</option>
                        <option value="30">Letzte 30 Tage</option>
                        <option value="90">Letzte 3 Monate</option>
                        <option value="365">Letztes Jahr</option>
                    </select>
                </div>
            </div>

            <div className="card">
                <table className="table w-full">
                    <thead>
                        <tr>
                            <th>Datum</th>
                            <th>Status</th>
                            <th>Schüler</th>
                            <th>Lehrkraft</th>
                            <th>Nachricht</th>
                            <th>Aktion</th>
                        </tr>
                    </thead>
                    <tbody>
                        {notes.length === 0 ? (
                            <tr><td colSpan={6} className="text-center p-4">Keine Nachrichten gefunden.</td></tr>
                        ) : (
                            notes.map((n) => (
                                <tr key={n.id} className={n.isDone ? "opacity-60" : ""}>
                                    <td style={{ whiteSpace: "nowrap" }}>
                                        {new Date(n.createdAt).toLocaleDateString("de-AT")} <br />
                                        <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })}</span>
                                    </td>
                                    <td>
                                        <span className={`badge ${n.isDone ? "badge-success" : "badge-warning"}`}>
                                            {n.isDone ? "Erledigt" : "Offen"}
                                        </span>
                                    </td>
                                    <td className="font-medium">{n.student?.firstName} {n.student?.lastName}</td>
                                    <td>{n.teacher?.name}</td>
                                    <td style={{ maxWidth: "400px" }}>{n.content}</td>
                                    <td>
                                        <button
                                            className="btn btn-sm btn-ghost"
                                            onClick={() => markNoteDone(n.id, n.isDone)}
                                            title={n.isDone ? "Als offen markieren" : "Als erledigt markieren"}
                                        >
                                            {n.isDone ? "↩️ Öffnen" : "✓ Erledigen"}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
