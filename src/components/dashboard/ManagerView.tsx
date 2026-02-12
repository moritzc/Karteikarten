export default function ManagerView() {
    return (
        <div className="p-8">
            <h2 className="text-3xl font-bold mb-6">Site Manager Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="card">
                    <h3 className="text-xl font-semibold mb-2">Daily Plan</h3>
                    <p className="text-muted-foreground mb-4">Assign students/groups for today.</p>
                    <button className="btn btn-primary">Manage Today</button>
                </div>
                <div className="card">
                    <h3 className="text-xl font-semibold mb-2">Students</h3>
                    <p className="text-muted-foreground mb-4">Manage student records and urgency.</p>
                    <button className="btn btn-primary">View Students</button>
                </div>
                <div className="card">
                    <h3 className="text-xl font-semibold mb-2">Teachers</h3>
                    <p className="text-muted-foreground mb-4">Manage teachers at this site.</p>
                    <button className="btn btn-secondary">View Teachers</button>
                </div>
            </div>
        </div>
    );
}
