"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignIn() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (res?.error) {
            setError("Invalid credentials");
        } else {
            router.push("/dashboard");
            router.refresh();
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="w-full max-w-md p-8 card">
                <h1 className="text-2xl font-bold text-center mb-6">Karteikarten System</h1>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input"
                            required
                        />
                    </div>

                    {error && <p className="text-destructive text-sm">{error}</p>}

                    <button
                        type="submit"
                        className="btn btn-primary w-full mt-2"
                    >
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
}
