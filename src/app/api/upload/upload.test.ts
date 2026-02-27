import { expect, test, mock, describe, beforeAll } from "bun:test";

// Mock next/server
mock.module("next/server", () => {
    return {
        NextResponse: {
            json: (body: any, init?: any) => ({
                json: () => Promise.resolve(body),
                status: init?.status || 200,
            }),
        },
        NextRequest: class {
            constructor(public url: string, public init?: any) {}
            formData() {
                 return Promise.resolve(new FormData());
            }
        }
    };
});

// Mock dependencies
mock.module("@/lib/prisma", () => ({
    prisma: {
        file: {
            create: (data: any) => Promise.resolve({ id: "file-id", ...data.data }),
        },
        auditLog: {
            create: () => Promise.resolve({ id: "audit-id" }),
        }
    },
}));

mock.module("@/lib/helpers", () => ({
    getSessionOrFail: () => Promise.resolve({ error: null, session: { user: { id: "user-id", role: "TEACHER" } } }),
    getUserFromSession: () => ({ id: "user-id", role: "TEACHER" }),
}));

mock.module("fs/promises", () => ({
    writeFile: () => Promise.resolve(),
    mkdir: () => Promise.resolve(),
    unlink: () => Promise.resolve(),
}));

mock.module("@/lib/audit", () => ({
    createAuditLog: () => Promise.resolve(),
}));

const { POST } = await import("./route");

describe("POST /api/upload", () => {
    test("should return error if no file provided", async () => {
        const req = {
            formData: () => {
                const fd = new FormData();
                return Promise.resolve(fd);
            }
        } as any;

        const res = await POST(req);
        // @ts-ignore
        const data = await res.json();
        // @ts-ignore
        expect(res.status).toBe(400);
        expect(data.error).toBe("No file provided");
    });

    test("should upload valid file", async () => {
        const req = {
            formData: () => {
                const fd = new FormData();
                const file = new File(["content"], "test.png", { type: "image/png" });
                fd.append("file", file);
                return Promise.resolve(fd);
            }
        } as any;

        const res = await POST(req);
        // @ts-ignore
        const data = await res.json();

        // @ts-ignore
        expect(res.status).toBe(201);
        expect(data.id).toBe("file-id");
        expect(data.url).toContain("/api/files/");
    });
});
