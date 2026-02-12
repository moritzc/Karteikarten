export default function TeacherView() {
    return (
        <div className="p-8">
            <h2 className="text-3xl font-bold mb-6">Teacher Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="card bg-primary/10 border-primary">
                    <h3 className="text-xl font-semibold mb-2 text-primary">Today's Classes</h3>
                    <p className="text-muted-foreground mb-4">View your assigned groups for today.</p>
                    <button className="btn btn-primary">Start Lesson</button>
                </div>
                <div className="card">
                    <h3 className="text-xl font-semibold mb-2">Submit Report</h3>
                    <p className="text-muted-foreground mb-4">Quickly add entries for students.</p>
                    <button className="btn btn-secondary">New Entry</button>
                </div>
            </div>
        </div>
    );
}
