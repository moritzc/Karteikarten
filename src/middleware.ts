import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
    const token = await getToken({ req });

    // If strict protection needed, we can check token here.
    // For now, allow access but check roles in component or layout if needed.
    // But let's protect specific paths:

    const path = req.nextUrl.pathname;

    if (path.startsWith("/dashboard") && !token) {
        return Response.redirect(new URL("/auth/signin", req.url));
    }
}

export const config = {
    matcher: ["/dashboard/:path*", "/admin/:path*"],
};
