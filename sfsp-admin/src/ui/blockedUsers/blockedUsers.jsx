import { useEffect, useState } from "react";
import "./blockedUsers.css";
import { UserX, Search, RotateCcw, Shield, AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";

const BlockedUsers = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [toastMessage, setToastMessage] = useState("");
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        high: 0,
        medium: 0,
        low: 0
    });

    useEffect(() => {
        const fetchBlockedUsers = async () => {
            try {
                const res = await fetch("http://localhost:5000/api/admin/users/blocked");
                const data = await res.json();
                if (data.success) {
                    setBlockedUsers(data.users);
                }
            } catch (err) {
                console.error("Failed to fetch blocked users:", err);
            }
        };

        const fetchStats = async () => {
            try {
                const res = await fetch("http://localhost:5000/api/admin/users/blocked/stats");
                const data = await res.json();
                if (data.success) {
                    setStats(data);
                }
            } catch (err) {
                console.error("Failed to fetch blocked stats:", err);
            }
        };

        fetchBlockedUsers();
        fetchStats();
    }, []);

    const filteredUsers = blockedUsers.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.reason.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleUnblockUser = async (userId, userName, userSeverity) => {
        try {
            const res = await fetch("http://localhost:5000/api/admin/users/unblock", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();

            if (data.success) {
                setBlockedUsers(prev => prev.filter(u => u.id !== userId));

                setStats(prev => ({
                    ...prev,
                    total: prev.total - 1,
                    [userSeverity.toLowerCase()]: prev[userSeverity.toLowerCase()] - 1
                }));

                setToastMessage(`${userName} has been restored to active status`);
                setTimeout(() => setToastMessage(""), 3000);
            }
        } catch (err) {
            console.error("Failed to unblock user:", err);
        }
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
                    <p>{stats.total}</p>
                </div>
                <div className="stat-card high">
                    <div className="stat-content">
                        <AlertCircle className="icon high" />
                        <p>High Severity</p>
                    </div>
                    <p>{stats.high}</p>
                </div>
                <div className="stat-card med">
                    <div className="stat-content">
                        <AlertTriangle className="icon medium" />
                        <p>Medium Severity</p>
                    </div>
                    <p>{stats.medium}</p>
                </div>
                <div className="stat-card low">
                    <div className="stat-content">
                        <CheckCircle className="icon low" />
                        <p>Low Severity</p>
                    </div>
                    <p>{stats.low}</p>
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
                                                {user.username
                                                    .split(" ")
                                                    .map(n => n[0])
                                                    .join("")
                                                    .toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <p className="name">{user.username}</p>
                                            <p className="email">{user.email}</p>
                                        </div>
                                    </div>

                                </td>
                                <td>
                                    <div className="reason-cell">
                                        {getReasonIcon(user.blocked_info.reason)}
                                        {user.blocked_info.reason}
                                    </div>
                                </td>
                                <td>
                                    <span className={`severity-badge ${getSeverityColor(user.blocked_info.severity)}`}>{user.blocked_info.severity}</span>
                                </td>
                                <td>{user.blocked_info.blocked_date}</td>
                                <td>{user.blocked_info.blocked_by}</td>
                                <td className="actions-cell">
                                    <button
                                        className="btn unblock"
                                        onClick={() => handleUnblockUser(user.id, user.username,user.blocked_info.severity)}
                                    >
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
