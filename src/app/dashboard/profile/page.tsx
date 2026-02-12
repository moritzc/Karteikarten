"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function ProfilePage() {
    const { data: session, update: updateSession } = useSession();
    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

    useEffect(() => {
        if (session?.user) {
            setForm({
                name: session.user.name || "",
                email: session.user.email || "",
                password: "",
            });
        }
    }, [session]);

    const handleSave = async () => {
        if (!session?.user) return;
        setLoading(true);
        setMessage(null);

        try {
            const body: any = { name: form.name };
            if (form.password) body.password = form.password;

            const res = await fetch(`/api/users/${(session.user as any).id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Fehler beim Speichern");
            }

            // Update session if name changed
            if (form.name !== session.user.name) {
                await updateSession({ name: form.name });
            }

            setMessage({ type: "success", text: "Profil erfolgreich aktualisiert!" });
            setForm((prev) => ({ ...prev, password: "" }));
        } catch (err: any) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setLoading(false);
        }
    };

    if (!session) return <div className="loading-center"><div className="spinner"></div></div>;

    return (
        <div className="animate-fade-in max-w-2xl mx-auto">
            <h1 className="page-title mb-6">👤 Mein Profil</h1>

            <div className="card">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
                    <div className="avatar h-16 w-16 text-2xl">
                        {form.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold">{form.name}</h2>
                        <p className="text-muted-foreground">{form.email}</p>
                        <span className="badge badge-primary mt-2 inline-block">
                            {(session.user as any).role === "ADMIN" ? "Administrator" :
                                (session.user as any).role === "SITE_MANAGER" ? "Standortleitung" : "Lehrkraft"}
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="form-group">
                        <label className="form-label">Name</label>
                        <input
                            className="input"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            className="input bg-muted/50"
                            value={form.email}
                            readOnly
                            disabled
                            title="Email kann nicht geändert werden"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Die Email-Adresse kann nur von einem Administrator geändert werden.</p>
                    </div>

                    <div className="form-group border-t border-border pt-4 mt-6">
                        <h3 className="font-semibold mb-4">Passwort ändern</h3>
                        <label className="form-label">Neues Passwort</label>
                        <input
                            className="input"
                            type="password"
                            placeholder="Leer lassen um Passwort beizubehalten"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                        {form.password && form.password.length < 6 && (
                            <p className="text-xs text-destructive mt-1">Passwort sollte mindestens 6 Zeichen lang sein.</p>
                        )}
                    </div>

                    {message && (
                        <div className={`p-3 rounded-md mb-4 ${message.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <button
                            className="btn btn-primary"
                            onClick={handleSave}
                            disabled={loading}
                        >
                            {loading ? "Speichere..." : "Speichern"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
