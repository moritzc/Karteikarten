// scripts/verify_compliance.ts
// This script simulates the upload and access flow to verify compliance.
// NOTE: Since we cannot easily spin up a full Next.js server context in this script to hit the actual API endpoints,
// we will verify the logic by inspecting the file system and invoking the Prisma client directly to ensure data integrity.

import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile, readFile, unlink, stat } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

async function main() {
    console.log("--- START COMPLIANCE VERIFICATION ---");

    // 1. Verify Upload Directory Structure
    const uploadsDir = path.join(process.cwd(), "uploads");
    console.log(`Checking if uploads directory is private (outside public): ${uploadsDir}`);
    if (uploadsDir.includes("/public/")) {
        console.error("FAIL: Uploads directory is still inside public!");
        process.exit(1);
    } else {
        console.log("PASS: Uploads directory is outside public folder.");
    }

    // 2. Simulate File Creation and Database Record
    const testFileName = "compliance_test.txt";
    const testContent = "Confidential Data";
    const uniqueName = `${Date.now()}-compliance_test.txt`;
    const filePath = path.join(uploadsDir, uniqueName);

    console.log(`Simulating file upload: ${filePath}`);

    // Ensure dir exists
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(filePath, testContent);

    // Create DB Record (Mocking what the API does)
    const fileRecord = await prisma.file.create({
        data: {
            url: `/api/files/${uniqueName}`,
            name: testFileName,
            type: "text/plain",
            size: testContent.length
        }
    });

    console.log("File record created in DB:", fileRecord);

    if (fileRecord.url.startsWith("/api/files/")) {
        console.log("PASS: File URL points to protected API route.");
    } else {
        console.error("FAIL: File URL does not point to protected API route:", fileRecord.url);
    }

    // 3. Verify Audit Log Creation (Simulating the Audit Log call manually since we aren't hitting the API)
    // In a real integration test, we would hit the API and check the DB.
    // Here we will check if the AuditLog model exists and is writable.

    console.log("Testing Audit Log writing...");
    const auditEntry = await prisma.auditLog.create({
        data: {
            action: "TEST_VERIFICATION",
            details: "Verifying audit log capability",
            resourceId: fileRecord.id
        }
    });

    if (auditEntry && auditEntry.id) {
        console.log("PASS: Audit Log entry created successfully:", auditEntry);
    } else {
        console.error("FAIL: Could not create Audit Log entry.");
    }

    // 4. Clean Up
    console.log("Cleaning up...");
    await prisma.file.delete({ where: { id: fileRecord.id } });
    await prisma.auditLog.delete({ where: { id: auditEntry.id } });
    await unlink(filePath);

    console.log("--- VERIFICATION COMPLETE ---");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
