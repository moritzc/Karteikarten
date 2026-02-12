import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="layout-with-sidebar">
            <Sidebar />
            <main className="main-content">{children}</main>
        </div>
    );
}
