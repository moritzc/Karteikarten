"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function SitesPage() {
    const { data: session } = useSession();
    const role = (session?.user as any)?.role;
    const [sites, setSites] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSiteModal, setShowSiteModal] = useState(false);
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingSite, setEditingSite] = useState<any>(null);
    const [roomSiteId, setRoomSiteId] = useState("");
    const [siteForm, setSiteForm] = useState({ name: "", address: "" });
    const [editForm, setEditForm] = useState({ name: "", address: "" });
    const [roomForm, setRoomForm] = useState({ name: "" });
    const [saving, setSaving] = useState(false);
    const [expandedSite, setExpandedSite] = useState<string | null>(null);

    const loadData = () => {
        Promise.all([
            fetch("/api/sites").then((r) => r.json()),
            fetch("/api/rooms").then((r) => r.json()),
        ]).then(([s, r]) => {
            setSites(Array.isArray(s) ? s : []);
            setRooms(Array.isArray(r) ? r : []);
            setLoading(false);
        });
    };

    useEffect(() => { loadData(); }, []);

    const handleCreateSite = async () => {
        setSaving(true);
        await fetch("/api/sites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(siteForm),
        });
        setSiteForm({ name: "", address: "" });
        setShowSiteModal(false);
        setSaving(false);
        loadData();
    };

    const openEditModal = (site: any) => {
        setEditingSite(site);
        setEditForm({ name: site.name || "", address: site.address || "" });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editingSite) return;
        setSaving(true);
        await fetch(`/api/sites/${editingSite.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editForm),
        });
        setShowEditModal(false);
        setEditingSite(null);
        setSaving(false);
        loadData();
    };

    const handleDeleteSite = async (id: string) => {
        if (!confirm("Standort wirklich löschen? Alle zugehörigen Räume werden ebenfalls gelöscht.")) return;
        await fetch(`/api/sites/${id}`, { method: "DELETE" });
        loadData();
    };

    const handleCreateRoom = async () => {
        if (!roomSiteId) return;
        setSaving(true);
        await fetch("/api/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: roomForm.name, siteId: roomSiteId }),
        });
        setRoomForm({ name: "" });
        setShowRoomModal(false);
        setSaving(false);
        loadData();
    };

    const handleDeleteRoom = async (id: string) => {
        if (!confirm("Raum wirklich löschen?")) return;
        await fetch(`/api/rooms?id=${id}`, { method: "DELETE" });
        loadData();
    };

    const openAddRoom = (siteId: string) => {
        setRoomSiteId(siteId);
        setRoomForm({ name: "" });
        setShowRoomModal(true);
    };

    const getRoomsForSite = (siteId: string) => rooms.filter((r) => r.siteId === siteId);

    if (loading) return <div className="loading-center"><div className="spinner"></div></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">🏢 Standorte & Räume</h1>
                {role === "ADMIN" && (
                    <button className="btn btn-primary" onClick={() => setShowSiteModal(true)}>+ Neuer Standort</button>
                )}
            </div>

            <div className="grid grid-2">
                {sites.map((site) => {
                    const siteRooms = getRoomsForSite(site.id);
                    const isExpanded = expandedSite === site.id;

                    return (
                        <div key={site.id} className="card card-hover" style={{ overflow: "hidden" }}>
                            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                                <h3 className="card-title" style={{ minWidth: 0, wordBreak: "break-word" }}>{site.name}</h3>
                                <div className="flex gap-1 flex-wrap" style={{ flexShrink: 0 }}>
                                    {role !== "TEACHER" && (
                                        <>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(site)} title="Standort bearbeiten">✏️</button>
                                            <button className="btn btn-outline btn-sm" onClick={() => openAddRoom(site.id)}>+ Raum</button>
                                        </>
                                    )}
                                    {role === "ADMIN" && (
                                        <button className="btn btn-ghost btn-sm text-destructive" onClick={() => handleDeleteSite(site.id)}>✕</button>
                                    )}
                                </div>
                            </div>
                            {site.address && <p className="text-sm text-muted-foreground mb-3">📍 {site.address}</p>}
                            <div className="flex gap-2 mb-3 flex-wrap">
                                <div className="badge badge-primary">{site._count?.users || 0} Benutzer</div>
                                <div className="badge badge-muted">{site._count?.students || 0} Schüler</div>
                                <div className="badge badge-muted">{site._count?.sessions || 0} Sitzungen</div>
                                <div className="badge badge-muted">🚪 {siteRooms.length} Räume</div>
                            </div>

                            {/* Rooms */}
                            {siteRooms.length > 0 && (
                                <div>
                                    <button
                                        className="btn btn-ghost btn-sm mb-2"
                                        onClick={() => setExpandedSite(isExpanded ? null : site.id)}
                                    >
                                        {isExpanded ? "▼" : "▶"} Räume anzeigen ({siteRooms.length})
                                    </button>
                                    {isExpanded && (
                                        <div className="flex flex-col gap-1 animate-fade-in">
                                            {siteRooms.map((room) => (
                                                <div key={room.id} className="info-bar justify-between" style={{ padding: "0.4rem 0.75rem" }}>
                                                    <span className="text-sm">🚪 {room.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">
                                                            {room._count?.sessions || 0} Sitzungen
                                                        </span>
                                                        {role !== "TEACHER" && (
                                                            <button className="btn btn-ghost btn-sm text-destructive" style={{ padding: "0 0.3rem" }} onClick={() => handleDeleteRoom(room.id)}>✕</button>
                                                        )}
                                                    </div>
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

            {sites.length === 0 && (
                <div className="card"><div className="empty-state">
                    <div className="empty-state-icon">🏢</div>
                    <p>Noch keine Standorte vorhanden.</p>
                </div></div>
            )}

            {/* Create Site Modal */}
            {showSiteModal && (
                <div className="modal-overlay" onClick={() => setShowSiteModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Neuen Standort erstellen</h2>
                        <div className="form-group mb-4">
                            <label className="form-label">Name *</label>
                            <input className="input" value={siteForm.name} onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })} placeholder="z.B. Standort Wien" />
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Adresse</label>
                            <input className="input" value={siteForm.address} onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })} placeholder="Straße, PLZ Ort" />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowSiteModal(false)}>Abbrechen</button>
                            <button className="btn btn-primary" onClick={handleCreateSite} disabled={!siteForm.name || saving}>
                                {saving ? "Erstelle..." : "Erstellen"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Site Modal */}
            {showEditModal && editingSite && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Standort bearbeiten</h2>
                        <div className="form-group mb-4">
                            <label className="form-label">Name *</label>
                            <input className="input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Standortname" />
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Adresse</label>
                            <input className="input" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="Straße, PLZ Ort" />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Abbrechen</button>
                            <button className="btn btn-primary" onClick={handleSaveEdit} disabled={!editForm.name || saving}>
                                {saving ? "Speichere..." : "Speichern"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Room Modal */}
            {showRoomModal && (
                <div className="modal-overlay" onClick={() => setShowRoomModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">Neuen Raum erstellen</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Für: {sites.find((s) => s.id === roomSiteId)?.name}
                        </p>
                        <div className="form-group mb-4">
                            <label className="form-label">Raumname *</label>
                            <input className="input" value={roomForm.name} onChange={(e) => setRoomForm({ name: e.target.value })} placeholder="z.B. Raum 1, Großer Saal" />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowRoomModal(false)}>Abbrechen</button>
                            <button className="btn btn-primary" onClick={handleCreateRoom} disabled={!roomForm.name || saving}>
                                {saving ? "Erstelle..." : "Raum erstellen"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
