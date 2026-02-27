import { prisma } from "./prisma";

interface AuditLogParams {
    action: string;
    details?: string | object;
    userId?: string;
    resourceId?: string;
}

/**
 * Creates an audit log entry in the database.
 * This is crucial for ISO 27001/27701 compliance to track access and modifications to sensitive data.
 */
export async function createAuditLog({ action, details, userId, resourceId }: AuditLogParams) {
    try {
        const detailsString = typeof details === "object" ? JSON.stringify(details) : details;

        await prisma.auditLog.create({
            data: {
                action,
                details: detailsString,
                userId: userId || null,
                resourceId: resourceId || null,
            },
        });
    } catch (error) {
        // In a production environment, we should ensure audit logging failures are handled critically.
        // For now, we log to console to avoid crashing the main request flow, but ideally this should alert admins.
        console.error("FAILED TO CREATE AUDIT LOG:", error);
    }
}
