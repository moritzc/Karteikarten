export default function AdminView() {
    return (
        <div className="p-8">
            <h2 className="text-3xl font-bold mb-6">Admin Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="card">
                    <h3 className="text-xl font-semibold mb-2">Manage Sites</h3>
                    <p className="text-muted-foreground mb-4">Create and manage locations.</p>
                    <button className="btn btn-primary">Go to Sites</button>
                </div>
                <div className="card">
                    <h3 className="text-xl font-semibold mb-2">Manage Users</h3>
                    <p className="text-muted-foreground mb-4">Create Site Managers and Teachers.</p>
                    <button className="btn btn-primary">Go to Users</button>
                </div>
                <div className="card">
                    <h3 className="text-xl font-semibold mb-2">System Export</h3>
                    <p className="text-muted-foreground mb-4">Export all data.</p>
                    <button className="btn btn-secondary">Export Data</button>
                </div>
            </div>
        </div>
    );
}
