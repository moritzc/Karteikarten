"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function HolidaysPage() {
    const { data: session } = useSession();
    const role = (session?.user as any)?.role;
    const [holidaySets, setHolidaySets] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSetModal, setShowSetModal] = useState(false);
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
    const [setForm, setSetForm] = useState({ name: "" });
    const [holidayForm, setHolidayForm] = useState({ name: "", startDate: "", endDate: "", schoolYear: "2025/26" });
    const [saving, setSaving] = useState(false);
    const [expandedSet, setExpandedSet] = useState<string | null>(null);

    const loadData = () => {
        Promise.all([
            fetch("/api/holiday-sets").then((r) => r.json()),
            fetch("/api/sites").then((r) => r.json()),
        ]).then(([hs, s]) => {
            setHolidaySets(Array.isArray(hs) ? hs : []);
            setSites(Array.isArray(s) ? s : []);
            setLoading(false);
        });
    };

    useEffect(() => { loadData(); }, []);

    const handleCreateSet = async () => {
        setSaving(true);
        await fetch("/api/holiday-sets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "createSet", name: setForm.name }),
        });
        setSetForm({ name: "" });
        setShowSetModal(false);
        setSaving(false);
        loadData();
    };

    const handleAddHoliday = async () => {
        if (!selectedSetId) return;
        setSaving(true);
        await fetch("/api/holiday-sets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "addHoliday",
                holidaySetId: selectedSetId,
                ...holidayForm,
            }),
        });
        setHolidayForm({ name: "", startDate: "", endDate: "", schoolYear: "2025/26" });
        setShowHolidayModal(false);
        setSaving(false);
        loadData();
    };

    const handleDeleteHoliday = async (id: string) => {
        if (!confirm("Ferieneintrag wirklich löschen?")) return;
        await fetch(`/api/holiday-sets?id=${id}&type=holiday`, { method: "DELETE" });
        loadData();
    };

    const handleDeleteSet = async (id: string) => {
        if (!confirm("Ferienset wirklich löschen? Alle Ferieneinträge darin werden gelöscht.")) return;
        await fetch(`/api/holiday-sets?id=${id}&type=set`, { method: "DELETE" });
        loadData();
    };

    const handleAssignSet = async (siteId: string, holidaySetId: string) => {
        await fetch(`/api/sites/${siteId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ holidaySetId: holidaySetId || null }),
        });
        loadData();
    };

    const openAddHoliday = (setId: string) => {
        setSelectedSetId(setId);
        setHolidayForm({ name: "", startDate: "", endDate: "", schoolYear: "2025/26" });
        setShowHolidayModal(true);
    };

    const formatDate = (d: string) => new Date(d).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" });

    if (role === "TEACHER") return <div className="card"><p>Kein Zugriff.</p></div>;
    if (loading) return <div className="loading-center"><div className="spinner"></div></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">🏖️ Ferienverwaltung</h1>
                <button className="btn btn-primary" onClick={() => setShowSetModal(true)}>+ Neues Ferienset</button>
            </div>

            {/* Site Holiday Assignment */}
            <div className="card mb-6">
                <h3 className="font-semibold mb-3">📍 Ferienzugehörigkeit der Standorte</h3>
                <p className="text-sm text-muted-foreground mb-4">Weisen Sie jedem Standort ein Ferienset zu. Wiederkehrende Gruppen überspringen automatisch Ferien.</p>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Standort</th>
                                <th>Ferienset</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sites.map((site) => (
                                <tr key={site.id}>
                                    <td><strong>{site.name}</strong></td>
                                    <td>
                                        <select
                                            className="select"
                                            value={site.holidaySetId || ""}
                                            onChange={(e) => handleAssignSet(site.id, e.target.value)}
                                            style={{ maxWidth: "300px" }}
                                        >
                                            <option value="">— Kein Ferienset —</option>
                                            {holidaySets.map((hs) => (
                                                <option key={hs.id} value={hs.id}>{hs.name} ({hs.holidays?.length || 0} Einträge)</option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Holiday Sets */}
            {holidaySets.length > 0 ? (
                <div className="grid grid-2">
                    {holidaySets.map((hs) => {
                        const isExpanded = expandedSet === hs.id;
                        return (
                            <div key={hs.id} className="card card-hover">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="card-title">{hs.name}</h3>
                                    <div className="flex gap-1">
                                        <button className="btn btn-outline btn-sm" onClick={() => openAddHoliday(hs.id)}>+ Ferien</button>
                                        {role === "ADMIN" && (
                                            <button className="btn btn-ghost btn-sm text-destructive" onClick={() => handleDeleteSet(hs.id)}>✕</button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2 mb-3">
                                    <span className="badge badge-primary">{hs.holidays?.length || 0} Ferieneinträge</span>
                                    <span className="badge badge-muted">{hs._count?.sites || 0} Standorte</span>
                                </div>

                                {hs.holidays?.length > 0 && (
                                    <div>
                                        <button className="btn btn-ghost btn-sm mb-2" onClick={() => setExpandedSet(isExpanded ? null : hs.id)}>
                                            {isExpanded ? "▼" : "▶"} Ferieneinträge ({hs.holidays.length})
                                        </button>
                                        {isExpanded && (
                                            <div className="flex flex-col gap-1 animate-fade-in">
                                                {hs.holidays.map((h: any) => (
                                                    <div key={h.id} className="info-bar justify-between" style={{ padding: "0.4rem 0.75rem" }}>
                                                        <div>
                                                            <span className="text-sm font-semibold">{h.name}</span>
                                                            <span className="text-xs text-muted-foreground ml-2">{formatDate(h.startDate)} — {formatDate(h.endDate)}</span>
                                                            <span className="badge badge-muted ml-2">{h.schoolYear}</span>
                                                        </div>
                                                        <button className="btn btn-ghost btn-sm text-destructive" style={{ padding: "0 0.3rem" }} onClick={() => handleDeleteHoliday(h.id)}>✕</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="card"><div className="empty-state">
                    <div className="empty-state-icon">🏖️</div>
                    <p>Noch keine Feriensets angelegt.</p>
                    <p className="text-sm text-muted-foreground">Erstellen Sie z.B. "Wien" oder "Niederösterreich" und fügen Sie die Ferienzeiträume hinzu.</p>
                </div></div>
            )}

            {/* Create Set Modal */}
            {showSetModal && (
                <div className="modal-overlay" onClick={() => setShowSetModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Neues Ferienset erstellen</h2>
                        <p className="text-sm text-muted-foreground mb-4">z.B. "Wien", "Niederösterreich", "Burgenland"</p>
                        <div className="form-group mb-4">
                            <label className="form-label">Name *</label>
                            <input className="input" value={setForm.name} onChange={(e) => setSetForm({ name: e.target.value })} placeholder="z.B. Wien" />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowSetModal(false)}>Abbrechen</button>
                            <button className="btn btn-primary" onClick={handleCreateSet} disabled={!setForm.name || saving}>{saving ? "Erstelle..." : "Erstellen"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Holiday Modal */}
            {showHolidayModal && (
                <div className="modal-overlay" onClick={() => setShowHolidayModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Ferieneintrag hinzufügen</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Für: {holidaySets.find((hs) => hs.id === selectedSetId)?.name}
                        </p>
                        <div className="form-group mb-4">
                            <label className="form-label">Bezeichnung *</label>
                            <input className="input" value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} placeholder="z.B. Weihnachtsferien, Semesterferien..." />
                        </div>
                        <div className="form-row mb-4">
                            <div className="form-group">
                                <label className="form-label">Beginn *</label>
                                <input className="input" type="date" value={holidayForm.startDate} onChange={(e) => setHolidayForm({ ...holidayForm, startDate: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ende *</label>
                                <input className="input" type="date" value={holidayForm.endDate} onChange={(e) => setHolidayForm({ ...holidayForm, endDate: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Schuljahr</label>
                            <select className="select" value={holidayForm.schoolYear} onChange={(e) => setHolidayForm({ ...holidayForm, schoolYear: e.target.value })}>
                                <option value="2024/25">2024/25</option>
                                <option value="2025/26">2025/26</option>
                                <option value="2026/27">2026/27</option>
                                <option value="2027/28">2027/28</option>
                            </select>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowHolidayModal(false)}>Abbrechen</button>
                            <button className="btn btn-primary" onClick={handleAddHoliday} disabled={!holidayForm.name || !holidayForm.startDate || !holidayForm.endDate || saving}>
                                {saving ? "Speichere..." : "Hinzufügen"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
