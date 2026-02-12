"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function ExportPage() {
    const { data: session } = useSession();
    const role = (session?.user as any)?.role;
    const [sites, setSites] = useState<any[]>([]);
    const [selectedSite, setSelectedSite] = useState("");
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        fetch("/api/sites").then((r) => r.json()).then((data) => {
            setSites(Array.isArray(data) ? data : []);
            setLoading(false);
        });
    }, []);

    const handleExport = async (siteId?: string) => {
        setExporting(true);
        const url = siteId ? `/api/export?siteId=${siteId}` : "/api/export";
        const res = await fetch(url);
        const blob = await res.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `export-${siteId || "alle"}-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(downloadUrl);
        setExporting(false);
    };

    if (loading) return <div className="loading-center"><div className="spinner"></div></div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">📦 Datenexport</h1>
            </div>

            <div className="grid grid-2">
                <div className="card">
                    <h3 className="card-title">Gesamtexport</h3>
                    <p className="card-description mb-4">
                        {role === "ADMIN"
                            ? "Alle Daten aller Standorte als JSON exportieren."
                            : "Daten Ihrer Standorte als JSON exportieren."}
                    </p>
                    <button
                        className="btn btn-primary"
                        onClick={() => handleExport()}
                        disabled={exporting}
                    >
                        {exporting ? "Exportiere..." : "📥 Alle Daten exportieren"}
                    </button>
                </div>

                <div className="card">
                    <h3 className="card-title">Standort-Export</h3>
                    <p className="card-description mb-4">Daten eines bestimmten Standorts exportieren.</p>
                    <div className="form-group mb-4">
                        <select className="select" value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)}>
                            <option value="">Standort wählen...</option>
                            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <button
                        className="btn btn-outline"
                        onClick={() => handleExport(selectedSite)}
                        disabled={!selectedSite || exporting}
                    >
                        {exporting ? "Exportiere..." : "📥 Standort exportieren"}
                    </button>
                </div>
            </div>

            <div className="alert alert-info mt-6">
                <span>ℹ️</span>
                <span>Der Export enthält alle Standortdaten, Schüler, Einträge, Noten, Schularbeiten und Dateimetadaten im JSON-Format.</span>
            </div>
        </div>
    );
}
