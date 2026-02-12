"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SessionsPage() {
    const router = useRouter();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/sessions").then((r) => r.json()).then((data) => {
            setSessions(Array.isArray(data) ? data : []);
            setLoading(false);
        });
    }, []);

    if (loading) return <div className="loading-center"><div className="spinner"></div></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">📝 Gruppen & Sitzungen</h1>
                <button className="btn btn-primary" onClick={() => router.push("/dashboard/daily-plan")}>
                    Zum Tagesplan
                </button>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Datum</th>
                            <th>Standort</th>
                            <th>Fach</th>
                            <th>Lehrkraft</th>
                            <th>Schüler</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sessions.map((s) => (
                            <tr key={s.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/dashboard/daily-plan`)}>
                                <td>{new Date(s.date).toLocaleDateString("de-AT")}</td>
                                <td>{s.site?.name}</td>
                                <td>{s.subjects?.map((sub: any) => sub.name).join(", ") || "—"}</td>
                                <td>{s.teacher?.name || "—"}</td>
                                <td>{s.students?.length || 0}</td>
                                <td>
                                    <span className={`badge ${s.completed ? "badge-success" : "badge-warning"}`}>
                                        {s.completed ? "Fertig" : "Offen"}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {sessions.length === 0 && (
                <div className="card mt-4"><div className="empty-state">
                    <div className="empty-state-icon">📝</div>
                    <p>Keine Sitzungen vorhanden.</p>
                </div></div>
            )}
        </div>
    );
}
