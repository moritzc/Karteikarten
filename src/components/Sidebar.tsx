"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const adminLinks = [
    { href: "/dashboard", label: "Übersicht", icon: "📊" },
    { href: "/dashboard/sites", label: "Standorte", icon: "🏢" },
    { href: "/dashboard/users", label: "Benutzer", icon: "👥" },
    { href: "/dashboard/teachers", label: "Lehrkräfte", icon: "👨‍🏫" },
    { href: "/dashboard/students", label: "Schüler", icon: "🎓" },
    { href: "/dashboard/subjects", label: "Fächer", icon: "📚" },
    { href: "/dashboard/daily-plan", label: "Tagesplan", icon: "📋" },
    { href: "/dashboard/sessions", label: "Gruppen/Sitzungen", icon: "📝" },
    { href: "/dashboard/calendar", label: "Kalender", icon: "📅" },
    { href: "/dashboard/holidays", label: "Ferien", icon: "🏖️" },
    { href: "/dashboard/export", label: "Datenexport", icon: "📦" },
    { href: "/dashboard/profile", label: "Mein Profil", icon: "👤" },
];

const managerLinks = [
    { href: "/dashboard", label: "Übersicht", icon: "📊" },
    { href: "/dashboard/daily-plan", label: "Tagesplan", icon: "📋" },
    { href: "/dashboard/students", label: "Schüler", icon: "🎓" },
    { href: "/dashboard/teachers", label: "Lehrkräfte", icon: "👨‍🏫" },
    { href: "/dashboard/sessions", label: "Gruppen/Sitzungen", icon: "📝" },
    { href: "/dashboard/subjects", label: "Fächer", icon: "📚" },
    { href: "/dashboard/calendar", label: "Kalender", icon: "📅" },
    { href: "/dashboard/holidays", label: "Ferien", icon: "🏖️" },
    { href: "/dashboard/export", label: "Datenexport", icon: "📦" },
    { href: "/dashboard/profile", label: "Mein Profil", icon: "👤" },
];

const teacherLinks = [
    { href: "/dashboard", label: "Übersicht", icon: "📊" },
    { href: "/dashboard/my-sessions", label: "Meine Gruppen", icon: "📋" },
    { href: "/dashboard/entries", label: "Meine Einträge", icon: "✏️" },
    { href: "/dashboard/calendar", label: "Kalender", icon: "📅" },
    { href: "/dashboard/profile", label: "Mein Profil", icon: "👤" },
];

export default function Sidebar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const [open, setOpen] = useState(false);

    const role = (session?.user as any)?.role;
    const links = role === "ADMIN" ? adminLinks : role === "SITE_MANAGER" ? managerLinks : teacherLinks;

    const handleNav = (href: string) => {
        router.push(href);
        setOpen(false);
    };

    return (
        <>
            <aside className={`sidebar ${open ? "open" : ""}`}>
                <div className="sidebar-header">
                    <div className="sidebar-brand">LernKartei</div>
                    <div style={{ fontSize: "0.75rem", color: "hsl(var(--muted-foreground))", marginTop: "0.25rem" }}>
                        {role === "ADMIN" ? "Administrator" : role === "SITE_MANAGER" ? "Standortleitung" : "Lehrkraft"}
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <div className="sidebar-section-title">Navigation</div>
                    {links.map((link) => (
                        <button
                            key={link.href}
                            className={`sidebar-link ${pathname === link.href ? "active" : ""}`}
                            onClick={() => handleNav(link.href)}
                        >
                            <span className="sidebar-link-icon">{link.icon}</span>
                            {link.label}
                        </button>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                        <div className="avatar">
                            {session?.user?.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div className="text-sm font-semibold truncate">{session?.user?.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{session?.user?.email}</div>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                        className="btn btn-ghost btn-sm w-full"
                    >
                        Abmelden
                    </button>
                </div>
            </aside>

            <div className={`sidebar-overlay ${open ? "open" : ""}`} onClick={() => setOpen(false)} />
            <button className="sidebar-toggle" onClick={() => setOpen(!open)}>
                {open ? "✕" : "☰"}
            </button>
        </>
    );
}
