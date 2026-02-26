import { expect, test, mock, describe } from "bun:test";

// Mock next/server
mock.module("next/server", () => ({
    NextResponse: {
        json: (body: any, init?: any) => ({
            status: init?.status || 200,
            json: () => Promise.resolve(body),
        }),
    },
}));

const { NextResponse } = await import("next/server");

// Mock dependencies
mock.module("@/lib/prisma", () => ({
    prisma: {
        file: {
            create: mock(() => Promise.resolve({ id: "file-id" })),
        },
    },
}));

mock.module("@/lib/helpers", () => ({
    getSessionOrFail: mock(() => Promise.resolve({ error: null, session: { user: { id: "user-id" } } })),
}));

mock.module("fs/promises", () => ({
    writeFile: mock(() => Promise.resolve()),
    mkdir: mock(() => Promise.resolve()),
}));

// We need to dynamic import the POST handler after mocking
const { POST } = await import("./route");

describe("POST /api/upload", () => {
    test("should reject if no file is provided", async () => {
        const formData = new FormData();
        const req = {
            formData: () => Promise.resolve(formData),
        } as any;

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe("No file provided");
    });

    test("should reject if file is too large", async () => {
        const formData = new FormData();
        // 11MB file
        const largeFile = new Blob([new Uint8Array(11 * 1024 * 1024)], { type: "image/jpeg" });
        // In Bun, we might need to mock the File object if it's not fully compatible with FormData.append
        formData.append("file", largeFile as any, "large.jpg");

        const req = {
            formData: () => Promise.resolve(formData),
        } as any;

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe("File too large (max 10MB)");
    });

    test("should reject if file type is invalid", async () => {
        const formData = new FormData();
        const invalidFile = new Blob(["test"], { type: "text/html" });
        formData.append("file", invalidFile as any, "test.html");

        const req = {
            formData: () => Promise.resolve(formData),
        } as any;

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe("Invalid file type");
    });

    test("should accept valid file", async () => {
        const formData = new FormData();
        const validFile = new Blob(["test"], { type: "image/jpeg" });
        formData.append("file", validFile as any, "test.jpg");

        const req = {
            formData: () => Promise.resolve(formData),
        } as any;

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(201);
        expect(data.id).toBe("file-id");
    });
});
