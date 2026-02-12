"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState({ sites: 0, users: 0, students: 0 });
    const [sites, setSites] = useState<any[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
    const [siteDetail, setSiteDetail] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/sites").then((r) => r.json()),
            fetch("/api/users").then((r) => r.json()),
            fetch("/api/students").then((r) => r.json()),
        ]).then(([s, users, students]) => {
            const sitesArr = Array.isArray(s) ? s : [];
            setSites(sitesArr);
            setStats({
                sites: sitesArr.length,
                users: Array.isArray(users) ? users.length : 0,
                students: Array.isArray(students) ? students.length : 0,
            });
            setLoading(false);
        });
    }, []);

    // Load detail when a site is selected
    useEffect(() => {
        if (!selectedSiteId) {
            setSiteDetail(null);
            return;
        }

        Promise.all([
            fetch(`/api/users?siteId=${selectedSiteId}`).then((r) => r.json()),
            fetch(`/api/students?siteId=${selectedSiteId}`).then((r) => r.json()),
            fetch(`/api/sessions?siteId=${selectedSiteId}`).then((r) => r.json()),
        ]).then(([users, students, sessions]) => {
            const usersArr = Array.isArray(users) ? users : [];
            const studentsArr = Array.isArray(students) ? students : [];
            const sessionsArr = Array.isArray(sessions) ? sessions : [];

            setSiteDetail({
                name: sites.find((s) => s.id === selectedSiteId)?.name || "",
                address: sites.find((s) => s.id === selectedSiteId)?.address || "",
                managers: usersArr.filter((u: any) => u.role === "SITE_MANAGER"),
                teachers: usersArr.filter((u: any) => u.role === "TEACHER"),
                students: studentsArr,
                totalSessions: sessionsArr.length,
                openSessions: sessionsArr.filter((s: any) => !s.completed).length,
            });
        });
    }, [selectedSiteId, sites]);

    if (loading) return <div className="loading-center"><div className="spinner"></div></div>;

    const roleLabel = (r: string) =>
        r === "ADMIN" ? "Administrator" : r === "SITE_MANAGER" ? "Standortleitung" : "Lehrkraft";

    return (
        <div>
            {/* Overview Stats */}
            <div className="grid grid-3 mb-8">
                <div className="stat-card">
                    <div className="stat-value">{stats.sites}</div>
                    <div className="stat-label">Standorte</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.users}</div>
                    <div className="stat-label">Benutzer</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.students}</div>
                    <div className="stat-label">Schüler</div>
                </div>
            </div>

            {/* Site Selector */}
            <div className="card mb-6" style={{ padding: "1rem 1.5rem" }}>
                <div className="flex items-center gap-4 flex-wrap">
                    <label className="form-label font-semibold" style={{ marginBottom: 0 }}>
                        🏢 Standort auswählen:
                    </label>
                    <select
                        className="select"
                        style={{ maxWidth: "300px" }}
                        value={selectedSiteId || ""}
                        onChange={(e) => setSelectedSiteId(e.target.value || null)}
                    >
                        <option value="">— Übersicht (alle Standorte) —</option>
                        {sites.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    {selectedSiteId && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedSiteId(null)}>
                            ✕ Zurück zur Übersicht
                        </button>
                    )}
                </div>
            </div>

            {/* Detail view for selected site */}
            {selectedSiteId && siteDetail && (
                <div className="animate-fade-in">
                    <div className="flex items-center gap-3 mb-6">
                        <h2 className="page-title" style={{ marginBottom: 0 }}>🏢 {siteDetail.name}</h2>
                        {siteDetail.address && <span className="text-muted-foreground text-sm">📍 {siteDetail.address}</span>}
                    </div>

                    {/* Site Stats */}
                    <div className="grid grid-4 mb-6">
                        <div className="stat-card">
                            <div className="stat-value">{siteDetail.managers.length}</div>
                            <div className="stat-label">Standortleitungen</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{siteDetail.teachers.length}</div>
                            <div className="stat-label">Lehrkräfte</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{siteDetail.students.length}</div>
                            <div className="stat-label">Schüler</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{siteDetail.openSessions}</div>
                            <div className="stat-label">Offene Gruppen</div>
                        </div>
                    </div>

                    {/* People at this site */}
                    <div className="grid grid-2 mb-6">
                        {/* Managers & Teachers */}
                        <div className="card">
                            <h3 className="card-title mb-4">👥 Benutzer am Standort</h3>
                            <div className="flex flex-col gap-2">
                                {[...siteDetail.managers, ...siteDetail.teachers].map((u: any) => (
                                    <div key={u.id} className="info-bar justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="avatar avatar-sm">{u.name?.charAt(0)?.toUpperCase()}</div>
                                            <span className="text-sm font-medium">{u.name}</span>
                                        </div>
                                        <span className={`badge ${u.role === "SITE_MANAGER" ? "badge-warning" : "badge-primary"}`}>
                                            {roleLabel(u.role)}
                                        </span>
                                    </div>
                                ))}
                                {siteDetail.managers.length === 0 && siteDetail.teachers.length === 0 && (
                                    <p className="text-sm text-muted-foreground">Keine Benutzer zugewiesen.</p>
                                )}
                            </div>
                            <button className="btn btn-outline btn-sm mt-4" onClick={() => router.push("/dashboard/users")}>
                                Benutzer verwalten →
                            </button>
                        </div>

                        {/* Students */}
                        <div className="card">
                            <h3 className="card-title mb-4">🎓 Schüler am Standort</h3>
                            <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                                <div className="flex flex-col gap-1">
                                    {siteDetail.students.map((s: any) => (
                                        <div
                                            key={s.id}
                                            className="info-bar cursor-pointer"
                                            style={{ cursor: "pointer" }}
                                            onClick={() => router.push(`/dashboard/students/${s.id}`)}
                                        >
                                            <span className="text-sm">{s.firstName} {s.lastName}</span>
                                        </div>
                                    ))}
                                    {siteDetail.students.length === 0 && (
                                        <p className="text-sm text-muted-foreground">Keine Schüler zugewiesen.</p>
                                    )}
                                </div>
                            </div>
                            <button className="btn btn-outline btn-sm mt-4" onClick={() => router.push("/dashboard/students")}>
                                Schüler verwalten →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Navigation — shown when no site selected */}
            {!selectedSiteId && (
                <div className="grid grid-3">
                    <div className="card card-clickable" onClick={() => router.push("/dashboard/sites")}>
                        <h3 className="card-title">🏢 Standorte verwalten</h3>
                        <p className="card-description">Standorte erstellen, bearbeiten und Benutzer zuordnen.</p>
                    </div>
                    <div className="card card-clickable" onClick={() => router.push("/dashboard/users")}>
                        <h3 className="card-title">👥 Benutzer verwalten</h3>
                        <p className="card-description">Standortleitungen und Lehrkräfte anlegen und bearbeiten.</p>
                    </div>
                    <div className="card card-clickable" onClick={() => router.push("/dashboard/students")}>
                        <h3 className="card-title">🎓 Schüler verwalten</h3>
                        <p className="card-description">Alle Schüler standortübergreifend einsehen.</p>
                    </div>
                    <div className="card card-clickable" onClick={() => router.push("/dashboard/subjects")}>
                        <h3 className="card-title">📚 Fächer verwalten</h3>
                        <p className="card-description">Unterrichtsfächer erstellen und konfigurieren.</p>
                    </div>
                    <div className="card card-clickable" onClick={() => router.push("/dashboard/export")}>
                        <h3 className="card-title">📦 Datenexport</h3>
                        <p className="card-description">Export aller Daten oder nach Standort gefiltert.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
