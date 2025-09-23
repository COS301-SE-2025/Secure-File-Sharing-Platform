import { useState } from "react";
import "./blockedUsers.css";
import { UserX, Search, RotateCcw, Shield, AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";

const BlockedUsers = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [toastMessage, setToastMessage] = useState("");

    const blockedUsers = [
        { id: 1, name: "Alex Thompson", email: "alex.thompson@example.com", reason: "Spam Activity", blockedDate: "2024-03-10", blockedBy: "Admin", severity: "High", reports: 12 },
        { id: 2, name: "Rachel Green", email: "rachel.green@example.com", reason: "Policy Violation", blockedDate: "2024-03-08", blockedBy: "System", severity: "Medium", reports: 5 },
        { id: 3, name: "David Brown", email: "david.brown@example.com", reason: "Suspicious Activity", blockedDate: "2024-03-05", blockedBy: "Admin", severity: "High", reports: 8 },
        { id: 4, name: "Lisa Anderson", email: "lisa.anderson@example.com", reason: "Terms Violation", blockedDate: "2024-03-01", blockedBy: "System", severity: "Low", reports: 3 }
    ];

    const filteredUsers = blockedUsers.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.reason.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleUnblockUser = (userName) => {
        setToastMessage(`${userName} has been restored to active status`);
        setTimeout(() => {
            setToastMessage("");
        }, 2000);
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case "High": return "severity-high";
            case "Medium": return "severity-medium";
            case "Low": return "severity-low";
            default: return "severity-low";
        }
    };

    const getReasonIcon = (reason) => {
        if (reason.includes("Spam")) return <AlertTriangle className="icon" />;
        if (reason.includes("Policy") || reason.includes("Terms")) return <Shield className="icon" />;
        return <UserX className="icon" />;
    };

    return (
        <div className="blocked-users-page">
            {toastMessage && <div className="toast">{toastMessage}</div>}
            {/* Header */}
            <div className="header">
                <h1 className="title">
                    <UserX className="header-icon" />
                    Blocked Users
                </h1>
                <p className="subtitle">Manage users who have been blocked from the platform</p>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card total">
                    <div className="stat-content">
                        <UserX className="stat-icon high" />
                        <p>Total Blocked</p>
                    </div>
                    <p>23</p>
                </div>
                <div className="stat-card high">
                    <div className="stat-content">
                        <AlertCircle className="icon high" />
                        <p>High Severity</p>
                    </div>
                    <p>8</p>
                </div>
                <div className="stat-card med">
                    <div className="stat-content">
                        <AlertTriangle className="icon medium" />
                        <p>Medium Severity</p>
                    </div>
                    <p>12</p>
                </div>
                <div className="stat-card low">
                    <div className="stat-content">
                        <CheckCircle className="icon low" />
                        <p>Low Severity</p>
                    </div>
                    <p>2</p>
                </div>
            </div>

            {/* Table */}
            <div className="table-card">
                <div className="table-header">
                    <div>
                        <h2>Blocked Users</h2>
                        <p>Users currently blocked from accessing the platform</p>
                    </div>
                    <div className="search-wrapper">
                        <Search className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search blocked users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                </div>

                <table className="users-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Reason</th>
                            <th>Severity</th>
                            <th>Blocked Date</th>
                            <th>Blocked By</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => (
                            <tr key={user.id}>
                                <td>
                                    <div className="user-info">
                                        {user.avatar ? (
                                            <img src={user.avatar} alt="avatar" className="avatar" />
                                        ) : (
                                            <div className="avatar-fallback">
                                                {user.name
                                                    .split(" ")
                                                    .map(n => n[0])
                                                    .join("")
                                                    .toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <p className="name">{user.name}</p>
                                            <p className="email">{user.email}</p>
                                        </div>
                                    </div>

                                </td>
                                <td>
                                    <div className="reason-cell">
                                        {getReasonIcon(user.reason)}
                                        {user.reason}
                                    </div>
                                </td>
                                <td>
                                    <span className={`severity-badge ${getSeverityColor(user.severity)}`}>{user.severity}</span>
                                </td>
                                <td>{user.blockedDate}</td>
                                <td>{user.blockedBy}</td>
                                <td className="actions-cell">
                                    <button className="btn unblock" onClick={() => handleUnblockUser(user.name)}>
                                        <RotateCcw className="btn-icon" />
                                        Unblock
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BlockedUsers;
