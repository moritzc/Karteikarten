import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import ManagerDashboard from "@/components/dashboard/ManagerDashboard";
import TeacherDashboard from "@/components/dashboard/TeacherDashboard";
import { formatDate } from "@/lib/helpers";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/auth/signin");

    const role = (session.user as any).role;
    const userId = (session.user as any).id;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Willkommen, {session.user?.name}!</h1>
                    <p className="text-sm text-muted-foreground mt-2">
                        {formatDate(new Date(), { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </p>
                </div>
            </div>

            {role === "ADMIN" && <AdminDashboard />}
            {role === "SITE_MANAGER" && <ManagerDashboard userId={userId} />}
            {role === "TEACHER" && <TeacherDashboard userId={userId} />}
        </div>
    );
}
