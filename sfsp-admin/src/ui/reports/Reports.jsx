import { useState } from "react";
import { AlertTriangle, Search, Eye, CheckCircle, XCircle, Clock, Flag } from "lucide-react";
import "./Reports.css";

const Reports = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [assignees, setAssignees] = useState({});
    const [statuses, setStatuses] = useState({});
    const [priorities, setPriorities] = useState({});
    const [selectedReport, setSelectedReport] = useState(null);


    const users = ["Alice", "Bob", "Charlie", "David"];

    const reports = [
        { id: 1, type: "Inappropriate Content", reportedUser: "john.doe@example.com", assignee: "", status: "Pending", priority: "High", createdDate: "2024-03-12" },
        { id: 2, type: "Spam Activity", reportedUser: "spam.user@example.com", assignee: "", status: "Under Review", priority: "Medium", createdDate: "2024-03-11" },
        { id: 3, type: "Harassment", reportedUser: "bad.actor@example.com", assignee: "", status: "Resolved", priority: "High", createdDate: "2024-03-10" },
        { id: 4, type: "Copyright Violation", reportedUser: "pirate.user@example.com", assignee: "", status: "Pending", priority: "Medium", createdDate: "2024-03-09" },
        { id: 5, type: "Data Breach", reportedUser: "suspicious.user@example.com", assignee: "", status: "Under Review", priority: "Critical", createdDate: "2024-03-08" }
    ];

    const filteredReports = reports.filter(report =>
        (report.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.reportedUser.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (statusFilter === "all" || report.status.toLowerCase().replace(" ", "-") === statusFilter)
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
        if (type.includes("Spam")) return <Flag className="icon" />;
        if (type.includes("Harassment")) return <AlertTriangle className="icon" />;
        if (type.includes("Content")) return <Eye className="icon" />;
        return <Clock className="icon" />;
    };

    return (
        <div className="reports-page">
            <header className="header">
                <h1 className="title">
                    <AlertTriangle className="header-icon" />
                    Reports Management
                </h1>
                <p className="subtitle">Review and manage reports</p>
            </header>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card warning">
                    <div className="stat-content">
                        <Clock className="stat-icon warning" />
                        <p className="stat-label">Pending</p>
                    </div>
                    <p className="stat-value">7</p>
                </div>

                <div className="stat-card accent">
                    <div className="stat-content">
                        <Eye className="stat-icon accent" />
                        <p className="stat-label">Under Review</p>
                    </div>
                    <p className="stat-value">3</p>
                </div>

                <div className="stat-card success">
                    <div className="stat-content">
                        <CheckCircle className="stat-icon success" />
                        <p className="stat-label">Resolved</p>
                    </div>
                    <p className="stat-value">15</p>
                </div>

                <div className="stat-card danger">
                    <div className="stat-content">
                        <AlertTriangle className="stat-icon danger" />
                        <p className="stat-label">Critical</p>
                    </div>
                    <p className="stat-value">2</p>
                </div>

                <div className="stat-card week">
                    <div className="stat-content">
                        <Flag className="stat-icon accent" />
                        <p className="stat-label">This Week</p>
                    </div>
                    <p className="stat-value">12</p>
                </div>
            </div>

            <div>
                <h></h>
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
                    <select className="drop" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="under-review">Under Review</option>
                        <option value="resolved">Resolved</option>
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
                            const currentAssignee = assignees[report.id] || report.assignee;
                            const currentStatus = statuses[report.id] || report.status;
                            const currentPriority = priorities[report.id] || report.priority;

                            return (
                                <tr key={report.id}>
                                    <td className="flex items-center gap-1">
                                        <div className="report-type">
                                            {getTypeIcon(report.type)} {report.type}
                                        </div>
                                    </td>
                                    <td>{report.reportedUser}</td>
                                    <td>
                                        <select
                                            value={currentAssignee}
                                            onChange={(e) => setAssignees({ ...assignees, [report.id]: e.target.value })}
                                        >
                                            <option value="">Unassigned</option>
                                            {users.map(user => <option key={user} value={user}>{user}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <select
                                            value={currentStatus}
                                            onChange={(e) => setStatuses({ ...statuses, [report.id]: e.target.value })}
                                            className={`badge ${getStatusColor(currentStatus)}`}
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Under Review">Under Review</option>
                                            <option value="Resolved">Resolved</option>
                                            <option value="Rejected">Rejected</option>
                                        </select>
                                    </td>
                                    <td>
                                        <select
                                            value={currentPriority}
                                            onChange={(e) => setPriorities({ ...priorities, [report.id]: e.target.value })}
                                            className={`badge ${getPriorityColor(currentPriority)}`}
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                            <option value="Critical">Critical</option>
                                        </select>
                                    </td>
                                    <td>{report.createdDate}</td>
                                    <td className="actions-cell">
                                        <button
                                            className="btn-view"
                                            onClick={() => setSelectedReport(report)}
                                        >
                                            View
                                        </button>
                                        <button className="btn-resolve">Resolve</button>
                                        <button className="btn-reject">Reject</button>
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
                                <p><strong>Reported User:</strong> {selectedReport.reportedUser}</p>
                                <p><strong>Assignee:</strong> {selectedReport.assignee || "Unassigned"}</p>
                                <p><strong>Status:</strong> {selectedReport.status}</p>
                                <p><strong>Priority:</strong> {selectedReport.priority}</p>
                                <p><strong>Date:</strong> {selectedReport.createdDate}</p>
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
