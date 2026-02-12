"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function UsersPage() {
    const { data: session } = useSession();
    const role = (session?.user as any)?.role;
    const [users, setUsers] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editUser, setEditUser] = useState<any>(null);
    const [form, setForm] = useState({ name: "", email: "", password: "", role: "TEACHER", siteIds: [] as string[] });
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");

    const loadData = () => {
        Promise.all([
            fetch("/api/users").then((r) => r.json()),
            fetch("/api/sites").then((r) => r.json()),
        ]).then(([u, s]) => {
            setUsers(Array.isArray(u) ? u : []);
            setSites(Array.isArray(s) ? s : []);
            setLoading(false);
        });
    };

    useEffect(() => { loadData(); }, []);

    const openCreateModal = () => {
        setEditUser(null);
        setForm({ name: "", email: "", password: "", role: "TEACHER", siteIds: [] });
        setShowModal(true);
    };

    const openEditModal = (user: any) => {
        setEditUser(user);
        setForm({
            name: user.name || "",
            email: user.email || "",
            password: "",
            role: user.role || "TEACHER",
            siteIds: user.sites?.map((s: any) => s.id) || [],
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        if (editUser) {
            // Update existing user
            const updateData: any = {
                name: form.name,
                email: form.email,
                siteIds: form.siteIds,
            };
            if (form.password) updateData.password = form.password;
            if (role === "ADMIN") updateData.role = form.role;

            const res = await fetch(`/api/users/${editUser.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updateData),
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.error || "Fehler beim Speichern");
            }
        } else {
            // Create new user
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.error || "Fehler beim Erstellen");
                setSaving(false);
                return;
            }
        }
        setShowModal(false);
        setEditUser(null);
        loadData();
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Benutzer wirklich löschen?")) return;
        await fetch(`/api/users/${id}`, { method: "DELETE" });
        loadData();
    };

    const toggleSite = (siteId: string) => {
        setForm((prev) => ({
            ...prev,
            siteIds: prev.siteIds.includes(siteId)
                ? prev.siteIds.filter((id) => id !== siteId)
                : [...prev.siteIds, siteId],
        }));
    };

    const filteredUsers = users.filter((u) =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="loading-center"><div className="spinner"></div></div>;

    const roleLabel = (r: string) =>
        r === "ADMIN" ? "Administrator" : r === "SITE_MANAGER" ? "Standortleitung" : "Lehrkraft";

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">👥 Benutzer</h1>
                <button className="btn btn-primary" onClick={openCreateModal}>+ Neuer Benutzer</button>
            </div>

            {/* Search */}
            <div className="filter-bar">
                <div className="form-group flex-1">
                    <input
                        className="input"
                        placeholder="Benutzer suchen..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <span className="badge badge-muted">{filteredUsers.length} Benutzer</span>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Rolle</th>
                            <th>Standorte</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user) => (
                            <tr key={user.id}>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <div className="avatar avatar-sm">{user.name?.charAt(0)?.toUpperCase()}</div>
                                        <span className="font-medium">{user.name}</span>
                                    </div>
                                </td>
                                <td className="text-sm text-muted-foreground">{user.email}</td>
                                <td>
                                    <span className={`badge ${user.role === "ADMIN" ? "badge-destructive" : user.role === "SITE_MANAGER" ? "badge-warning" : "badge-primary"}`}>
                                        {roleLabel(user.role)}
                                    </span>
                                </td>
                                <td>
                                    <div className="flex gap-1 flex-wrap">
                                        {user.sites?.map((s: any) => (
                                            <span key={s.id} className="badge badge-muted">{s.name}</span>
                                        ))}
                                        {(!user.sites || user.sites.length === 0) && (
                                            <span className="text-xs text-muted-foreground">Keine</span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <div className="flex gap-1">
                                        <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(user)}>
                                            ✏️ Bearbeiten
                                        </button>
                                        {role === "ADMIN" && user.role !== "ADMIN" && (
                                            <button className="btn btn-ghost btn-sm text-destructive" onClick={() => handleDelete(user.id)}>
                                                Löschen
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">
                            {editUser ? `${editUser.name} bearbeiten` : "Neuen Benutzer erstellen"}
                        </h2>
                        <div className="form-group mb-4">
                            <label className="form-label">Name *</label>
                            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Email *</label>
                            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">
                                {editUser ? "Neues Passwort (leer lassen = unverändert)" : "Passwort *"}
                            </label>
                            <input
                                className="input"
                                type="password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                placeholder={editUser ? "••••••••" : "Passwort eingeben"}
                            />
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Rolle</label>
                            <select
                                className="select"
                                value={form.role}
                                onChange={(e) => setForm({ ...form, role: e.target.value })}
                                disabled={editUser?.role === "ADMIN" || role !== "ADMIN"}
                            >
                                {role === "ADMIN" && <option value="ADMIN">Administrator</option>}
                                {role === "ADMIN" && <option value="SITE_MANAGER">Standortleitung</option>}
                                <option value="TEACHER">Lehrkraft</option>
                            </select>
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Standorte zuweisen</label>
                            <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", padding: "0.5rem" }}>
                                {sites.map((site) => (
                                    <label key={site.id} className="checkbox-wrapper" style={{ padding: "0.375rem 0.5rem" }}>
                                        <input
                                            type="checkbox"
                                            checked={form.siteIds.includes(site.id)}
                                            onChange={() => toggleSite(site.id)}
                                        />
                                        <span className="text-sm">{site.name}</span>
                                    </label>
                                ))}
                                {sites.length === 0 && <p className="text-sm text-muted-foreground p-2">Keine Standorte vorhanden.</p>}
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => { setShowModal(false); setEditUser(null); }}>Abbrechen</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={!form.name || !form.email || (!editUser && !form.password) || saving}
                            >
                                {saving ? "Speichere..." : editUser ? "Speichern" : "Erstellen"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
