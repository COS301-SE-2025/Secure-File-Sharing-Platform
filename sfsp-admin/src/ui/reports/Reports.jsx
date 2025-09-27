import { useEffect, useState } from "react";
import { AlertTriangle, Search, Eye, CheckCircle, XCircle, Clock, Flag, Plus } from "lucide-react";
import "./Reports.css";

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [stats, setStats] = useState({});
    const [admins, setAdmins] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedReport, setSelectedReport] = useState(null);

    const [addReportModalOpen, setAddReportModalOpen] = useState(false);
    const [newReportType, setNewReportType] = useState("");
    const [newReportedUser, setNewReportedUser] = useState("");
    const [newPriority, setNewPriority] = useState("Low");
    const [newInfo, setNewInfo] = useState("");

    useEffect(() => {
        fetch("http://localhost:5000/api/admin/reports")
            .then(res => res.json())
            .then(data => setReports(data.data || []));

        fetch("http://localhost:5000/api/admin/report-stats")
            .then(res => res.json())
            .then(data => setStats(data.data || {}));

        fetch("http://localhost:5000/api/admin/assignees")
            .then(res => res.json())
            .then(data => setAdmins(data.data || []));
    }, []);

    const filteredReports = reports.filter(report =>
        report && (
            (report.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                report.reported_user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                report.date?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                report.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                report.priority?.toLowerCase().includes(searchTerm.toLowerCase()))
        ) &&
        (statusFilter === "all" || report.status?.toLowerCase().replace(" ", "-") === statusFilter)
    );


    const getStatusColor = (status) => {
        switch (status) {
            case "Pending": return "badge-warning";
            case "Under Review": return "badge-accent";
            case "Resolved": return "badge-success";
            case "Rejected": return "badge-danger";
            default: return "badge-surface";
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case "Critical": return "badge-danger";
            case "High": return "badge-warning";
            case "Medium": return "badge-accent";
            case "Low": return "badge-success";
            default: return "badge-surface";
        }
    };

    const getTypeIcon = (type) => {
        if (type?.includes("Spam")) return <Flag className="icon" />;
        if (type?.includes("Harassment")) return <AlertTriangle className="icon" />;
        if (type?.includes("Content")) return <Eye className="icon" />;
        return <Clock className="icon" />;
    };

    const updateReport = (id, updates) => {
        fetch(`http://localhost:5000/api/admin/reports/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
        })
            .then(res => res.json())
            .then(data => {
                setReports(reports.map(r => (r.id === id ? data.data : r)));
            });
    };

    return (
        <div className="reports-page">
            <header className="header">
                <div className="header-left">
                    <h1 className="title">
                        <AlertTriangle className="header-icon" />
                        Reports Management
                    </h1>

                </div>

                <div className="header-right">
                    <button className="btn-add-report" onClick={() => setAddReportModalOpen(true)}>
                        + Add New Report
                    </button>
                </div>
            </header>

            {addReportModalOpen && (
                <div className="modal-overlay" onClick={() => setAddReportModalOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Add New Report</h2>
                        <div className="modal-content">
                            <label>Type</label>
                            <input
                                type="text"
                                value={newReportType}
                                onChange={(e) => setNewReportType(e.target.value)}
                                placeholder="Report type"
                            />
                            <label>Reported User (email)</label>
                            <input
                                type="email"
                                value={newReportedUser}
                                onChange={(e) => setNewReportedUser(e.target.value)}
                                placeholder="user@example.com"
                            />
                            <label>Priority</label>
                            <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                            </select>
                            <label>Additional Info</label>
                            <textarea
                                value={newInfo}
                                onChange={(e) => setNewInfo(e.target.value)}
                                placeholder="Additional information..."
                            />
                        </div>
                        <div className="modal-actions">
                            <button
                                className="btn-add"
                                onClick={() => {
                                    fetch("http://localhost:5000/api/admin/reports", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            type: newReportType,
                                            reported_user: newReportedUser,
                                            priority: newPriority,
                                            info: newInfo,
                                            status: "Pending",
                                            assignee: ""
                                        })
                                    })
                                        .then(res => res.json())
                                        .then(data => {
                                            setReports([data.data, ...reports]);
                                            setAddReportModalOpen(false);
                                            setNewReportType("");
                                            setNewReportedUser("");
                                            setNewPriority("Low");
                                            setNewInfo("");
                                        });
                                }}
                            >
                                Submit
                            </button>
                            <button className="btn-cancel" onClick={() => setAddReportModalOpen(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            <p className="subtitle">Review and manage reports</p>
            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card warning">
                    <div className="stat-content"><Clock className="stat-icon warning" /><p>Pending</p></div>
                    <p className="stat-value">{stats.pending || 0}</p>
                </div>
                <div className="stat-card accent">
                    <div className="stat-content"><Eye className="stat-icon accent" /><p>Under Review</p></div>
                    <p className="stat-value">{stats.underReview || 0}</p>
                </div>
                <div className="stat-card success">
                    <div className="stat-content"><CheckCircle className="stat-icon success" /><p>Resolved</p></div>
                    <p className="stat-value">{stats.resolved || 0}</p>
                </div>
                <div className="stat-card danger">
                    <div className="stat-content"><AlertTriangle className="stat-icon danger" /><p>Critical</p></div>
                    <p className="stat-value">{stats.critical || 0}</p>
                </div>
                <div className="stat-card week">
                    <div className="stat-content"><Flag className="stat-icon accent" /><p>This Week</p></div>
                    <p className="stat-value">{stats.thisWeek || 0}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="table-card">
                <div className="table-header">
                    <div>
                        <h2>All Reports</h2>
                        <p>User reports</p>
                    </div>
                </div>
                <div className="filters">
                    <select className="filters-drop" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="under-review">Under Review</option>
                        <option value="resolved">Resolved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <div className="search-wrapper">
                        <Search className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search reports..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Reports Table */}
                <table className="reports-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Reported User</th>
                            <th>Assignee</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredReports.map(report => {
                            const isReadOnly = report.status === "Resolved" || report.status === "Rejected";

                            return (
                                <tr key={report.id}>
                                    <td className="flex items-center gap-1">{getTypeIcon(report.type)} {report.type}</td>
                                    <td>{report.reported_user}</td>
                                    <td>
                                        <select
                                            value={report.assignee || ""}
                                            onChange={(e) => updateReport(report.id, { assignee: e.target.value })}
                                            disabled={isReadOnly} // disable if resolved or rejected
                                        >
                                            <option value="">Unassigned</option>
                                            {admins.map(user => (
                                                <option key={user.id} value={user.username}>{user.username}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td>
                                        <select
                                            value={report.status}
                                            onChange={(e) => updateReport(report.id, { status: e.target.value })}
                                            className={`badge ${getStatusColor(report.status)}`}
                                            disabled={isReadOnly}
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Under Review">Under Review</option>
                                            <option value="Resolved">Resolved</option>
                                            <option value="Rejected">Rejected</option>
                                        </select>
                                    </td>
                                    <td>
                                        <select
                                            value={report.priority}
                                            onChange={(e) => updateReport(report.id, { priority: e.target.value })}
                                            className={`badge ${getPriorityColor(report.priority)}`}
                                            disabled={isReadOnly}
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                            <option value="Critical">Critical</option>
                                        </select>
                                    </td>
                                    <td>{new Date(report.created_at).toLocaleDateString()}</td>
                                    <td className="actions-cell">
                                        <button className="btn-view" onClick={() => setSelectedReport(report)}>View</button>
                                        {!isReadOnly && (
                                            <>
                                                <button className="btn-resolve" onClick={() => updateReport(report.id, { status: "Resolved" })}>Resolve</button>
                                                <button className="btn-reject" onClick={() => updateReport(report.id, { status: "Rejected" })}>Reject</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>

                </table>

                {selectedReport && (
                    <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <h2>Report Details</h2>
                            <div className="modal-content">
                                <p><strong>Type:</strong> {selectedReport.type}</p>
                                <p><strong>Reported User:</strong> {selectedReport.reported_user}</p>
                                <p><strong>Assignee:</strong> {selectedReport.assignee || "Unassigned"}</p>
                                <p><strong>Status:</strong> {selectedReport.status}</p>
                                <p><strong>Priority:</strong> {selectedReport.priority}</p>
                                <p><strong>Date:</strong> {new Date(selectedReport.created_at).toLocaleDateString()}</p>
                                <p><strong>Info:</strong> {selectedReport.info || "No additional details provided"}</p>
                            </div>
                            <div className="modal-actions">
                                <button onClick={() => setSelectedReport(null)}>Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reports;
