"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Header() {
    const { data: session } = useSession();

    return (
        <header className="border-b bg-card p-4 flex justify-between items-center text-card-foreground">
            <Link href="/dashboard" className="text-xl font-bold">
                Karteikarten
            </Link>

            <div className="flex items-center gap-4">
                {session?.user && (
                    <>
                        <span className="text-sm text-muted-foreground mr-2">
                            {session.user.name} ({(session.user as any).role})
                        </span>
                        <button
                            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                            className="text-sm font-medium hover:text-primary transition-colors"
                        >
                            Sign Out
                        </button>
                    </>
                )}
            </div>
        </header>
    );
}
