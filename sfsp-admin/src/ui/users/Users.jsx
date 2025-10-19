import { useEffect, useState } from "react";
import { Users as UsersIcon, Search, Trash2, Mail, Info, Shield, Settings, CheckCircle, XCircle, Slash } from "lucide-react";
import "./Users.css";
import { adminFetch } from '../../api/api_config';

const Users = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
    const [newAdminUsername, setNewAdminUsername] = useState("");
    const [newAdminEmail, setNewAdminEmail] = useState("");
    const [toastMessage, setToastMessage] = useState("");
    const [infoModalOpen, setInfoModalOpen] = useState(false);
    const [messageModalOpen, setMessageModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [totalUsers, setTotalUsers] = useState(0);
    const [totalAdminUsers, setTotalAdminUsers] = useState(0);
    const [users, setUsers] = useState([]);
    const [blockModalOpen, setBlockModalOpen] = useState(false);
    const [blockReason, setBlockReason] = useState("");
    const [blockSeverity, setBlockSeverity] = useState("Low");
    const [blockUserId, setBlockUserId] = useState(null);
    const [blockUserName, setBlockUserName] = useState("");
    const [messageSubject, setMessageSubject] = useState("");
    const [messageBody, setMessageBody] = useState("");

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await adminFetch("/users");
                const data = res;

                if (data.success) {
                    const formattedUsers = data.users.map(u => ({
                        ...u,
                        avatar: u.avatar_url
                    }));
                    setUsers(formattedUsers);
                }
            } catch (err) {
                console.error("Failed to fetch users:", err);
            }
        };

        fetchUsers();
    }, []);



    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const res = await adminFetch("/users/count");
                const data = res;

                if (data.success) {
                    setTotalUsers(data.totalUsers);
                    setTotalAdminUsers(data.adminUsers);
                }
            } catch (err) {
                console.error("Failed to fetch user counts:", err);
            }
        };

        fetchCounts();
    }, []);


    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDeleteUser = async (userId, userName, role) => {
        try {
            const res = await adminFetch("/users/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });

            const data = res;

            if (data.success) {
                setUsers(prev => prev.filter(u => u.id !== userId));
                setTotalUsers(prev => prev - 1);
                if (role === "admin") setTotalAdminUsers(prev => prev - 1);
                setToastMessage(`${userName} has been removed from the system`);
            } else {
                setToastMessage(data.message || "Failed to delete user");
            }

            setTimeout(() => setToastMessage(""), 3000);
        } catch (err) {
            console.error("Failed to delete user:", err);
            setToastMessage("Failed to delete user");
            setTimeout(() => setToastMessage(""), 3000);
        }
    };


    const handleSendMessage = (user) => {
        setSelectedUser(user);
        setMessageModalOpen(true);
    };

    const handleViewInfo = (user) => {
        setSelectedUser(user);
        setInfoModalOpen(true);
    };

    const handleBlockUser = (userId, userName) => {
        setBlockUserId(userId);
        setBlockUserName(userName);
        setBlockReason("");
        setBlockSeverity("Low");
        setBlockModalOpen(true);
    };

    const submitBlockUser = async () => {
        if (!blockReason) {
            setToastMessage("Please enter a reason");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        try {
            const res = await adminFetch("/users/block", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: blockUserId,
                    reason: blockReason,
                    severity: blockSeverity,
                    blockedBy: "admin",
                }),
            });

            const data = res;
            if (data.success) {
                setToastMessage(`User ${blockUserName} blocked successfully`);
                setUsers(prev =>
                    prev.map(u => u.id === blockUserId ? { ...u, active: false, blocked_info: data.user.blocked_info } : u)
                );
                setBlockModalOpen(false);
            } else {
                setToastMessage(data.message || "Failed to block user");
            }
            setTimeout(() => setToastMessage(""), 3000);
        } catch (err) {
            console.error("Failed to block user:", err);
            setToastMessage("Failed to block user");
            setTimeout(() => setToastMessage(""), 3000);
        }
    };

    const handleCreateAdmin = async () => {
        if (!newAdminUsername || !newAdminEmail) {
            setToastMessage("Please fill in all fields");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }

        try {
            const res = await adminFetch("/users/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: newAdminUsername,
                    email: newAdminEmail,
                    role: "Admin",
                }),
            });

            const data = res;

            if (data.success) {
                setUsers(prev =>
                    prev.map(u =>
                        u.id === data.user.id
                            ? { ...data.user, avatar: data.user.avatar_url || u.avatar }
                            : u
                    )
                );
                setToastMessage(`${newAdminUsername} has been granted admin privileges`);
                setNewAdminUsername("");
                setNewAdminEmail("");
                setIsAdminDialogOpen(false);
                setTotalAdminUsers(prev => prev + 1);
                setTimeout(() => setToastMessage(""), 3000);
            } else {
                setToastMessage(data.message || "Failed to create admin");
                setTimeout(() => setToastMessage(""), 3000);
                setIsAdminDialogOpen(false);
                setNewAdminUsername("");
                setNewAdminEmail("");
            }
        } catch (err) {
            console.error("Failed to create admin:", err);
            setToastMessage("Failed to create admin",err.Error);
            setTimeout(() => setToastMessage(""), 3000);
            setIsAdminDialogOpen(false);
            setNewAdminUsername("");
            setNewAdminEmail("");
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            const res = await adminFetch("/users/role", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, newRole }),
            });

            const data = res;
            if (data.success) {
                setToastMessage(data.message);
                setUsers(prev =>
                    prev.map(user => (user.id === userId ? { ...user, role: newRole } : user))
                );
                setTimeout(() => setToastMessage(""), 3000);
                setTotalAdminUsers(prev => prev - 1);
            }
        } catch (err) {
            console.error("Failed to update role:", err);
        }
    };

    const getRoleColor = (role) => role === "admin" ? "role-admin" : "role-general";

    return (
        <div className="users-page">
            {toastMessage && <div className="toast">{toastMessage}</div>}

            {/* Header */}
            <div className="header">
                <h1><UsersIcon className="icon" /> User Management</h1>

            </div>
            <p>Manage and monitor all platform users</p>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card stat-users">
                    <div className="stat-content">
                        <UsersIcon className="stat-icon" />
                        <p>Total Users</p>
                    </div>
                    <strong>{totalUsers}</strong>
                </div>

                <div className="stat-card stat-admin">
                    <div className="stat-content">
                        <Shield className="stat-icon" />
                        <p>Total Admin Users</p>
                    </div>
                    <strong>{totalAdminUsers}</strong>
                </div>

                <div className="stat-card stat-admin-management">
                    <div className="stat-content">
                        <Settings className="stat-icon" />
                        <p>Admin Management</p>
                    </div>
                    <button onClick={() => setIsAdminDialogOpen(true)}>Manage</button>
                </div>
            </div>

            {/* Admin Dialog */}
            {isAdminDialogOpen && (
                <div className="modal-backdrop" onClick={() => setIsAdminDialogOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">Manage Admin Users</h3>

                        {/* Create New Admin */}
                        <div className="admin-create-section">
                            <h4>Create New Admin User</h4>
                            <label>Username</label>
                            <input
                                type="text"
                                value={newAdminUsername}
                                onChange={(e) => setNewAdminUsername(e.target.value)}
                                placeholder="Enter username"
                            />
                            <label>Email</label>
                            <input
                                type="email"
                                value={newAdminEmail}
                                onChange={(e) => setNewAdminEmail(e.target.value)}
                                placeholder="Enter email"
                            />
                            <button onClick={handleCreateAdmin}>Create Admin</button>
                        </div>

                        {/* Existing Admins */}
                        <div className="existing-admins-section">
                            <h4>Existing Admin Users</h4>
                            <div className="existing-admins-list">
                                {users
                                    .filter((user) => user.role === "admin")
                                    .map((admin) => (
                                        <div key={admin.id} className="admin-row">
                                            <div className="admin-info">
                                                {admin.avatar ? (
                                                    <img src={admin.avatar} alt="avatar" className="avatar" />
                                                ) : (
                                                    <div className="avatar-fallback">
                                                        {admin.username
                                                            .split(" ")
                                                            .map((n) => n[0])
                                                            .join("")}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="admin-name">{admin.name || admin.username}</p>
                                                    <p className="admin-username">{admin.email}</p>
                                                </div>
                                            </div>

                                            <select
                                                value={admin.role}
                                                onChange={(e) => handleRoleChange(admin.id, e.target.value)}
                                                className="role-select"
                                            >
                                                <option value="admin">Admin</option>
                                                <option value="general">General</option>
                                            </select>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}



            {/* Users Table */}
            <div className="users-table-card">
                <div className="table-header">
                    <h2>All Users</h2>
                    <div className="search-wrapper">
                        <Search className="icon-search" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <table className="users-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Role</th>
                            <th>Verified</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="table-row">
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
                                    <span className={`role-badge ${getRoleColor(user.role)}`}>{user.role}</span>
                                </td>
                                <td>
                                    {user.is_verified ? (
                                        <CheckCircle className="icon-verified" />
                                    ) : (
                                        <XCircle className="icon-unverified" />
                                    )}
                                </td>
                                <td className="actions-cell">
                                    <button className="btn-info" onClick={() => handleViewInfo(user)} title="View Info">
                                        <Info className="icon-action" />
                                    </button>
                                    <button className="btn-message" onClick={() => handleSendMessage(user)} title="Send Message">
                                        <Mail className="icon-action" />
                                    </button>
                                    <button className="btn-delete" onClick={() => handleDeleteUser(user.id, user.username, user.role)} title="Delete User">
                                        <Trash2 className="icon-action" />
                                    </button>
                                    <button className="btn-block" onClick={() => handleBlockUser(user.id, user.username)} title="Block User">
                                        <Slash className="icon-action" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Info Modal */}
            {infoModalOpen && selectedUser && (
                <div className="modal-backdrop" onClick={() => setInfoModalOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>{selectedUser.username} Info</h2>
                        <p><strong>Username:</strong> @{selectedUser.username}</p>
                        <p><strong>Email:</strong> {selectedUser.email}</p>
                        <p><strong>Created:</strong> {new Date(selectedUser.created_at).toLocaleString()}</p>
                        <p><strong>Role:</strong> {selectedUser.role}</p>
                        <p><strong>Verified:</strong> {selectedUser.verified ? "Yes" : "No"}</p>
                        <p><strong>Avatar:</strong> {selectedUser.avatar || "None"}</p>
                        <p><strong>Active:</strong> {selectedUser.active ? "Yes" : "No"}</p>
                        {!selectedUser.active && selectedUser.blocked_info && (
                            <div className="blocked-info">
                                <h4>Blocked Information</h4>
                                <p><strong>Reason:</strong> {selectedUser.blocked_info.reason}</p>
                                <p><strong>Severity:</strong>{selectedUser.blocked_info.severity}</p>
                                <p><strong>Blocked By:</strong> {selectedUser.blocked_info.blocked_by}</p>
                                <p><strong>Blocked Date:</strong> {new Date(selectedUser.blocked_info.blocked_date).toLocaleString()}</p>
                            </div>
                        )}
                        <button className="btn-close" onClick={() => setInfoModalOpen(false)}>Close</button>
                    </div>
                </div>
            )}

            {/* Message Modal */}
            {messageModalOpen && selectedUser && (
                <div className="modal-backdrop" onClick={() => setMessageModalOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Send Message to {selectedUser.name}</h2>
                        <input
                            type="text"
                            placeholder="Subject"
                            className="subject-input"
                            value={messageSubject}
                            onChange={(e) => setMessageSubject(e.target.value)}
                        />
                        <textarea
                            placeholder="Type your message here..."
                            className="message-input"
                            value={messageBody}
                            onChange={(e) => setMessageBody(e.target.value)}
                        />
                        <div className="btn-send">
                            <button
                                className="btn-info"
                                onClick={async () => {
                                    try {
                                        const res = await adminFetch("/send-message", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                userId: selectedUser.id,
                                                email: selectedUser.email,
                                                username: selectedUser.username,
                                                subject: messageSubject,
                                                message: messageBody,
                                            }),
                                        });
                                        const data = res;
                                        if (data.success) {
                                            setToastMessage(`Message sent to ${selectedUser.username}`);
                                            setTimeout(() => setToastMessage(""), 3000);
                                            setMessageModalOpen(false);
                                            setMessageSubject("");
                                            setMessageBody("");
                                        } else {
                                            setToastMessage(`⚠️ ${data.message}`);
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        setToastMessage("⚠️ Failed to send message.");
                                    }
                                }}
                            >
                                Send
                            </button>
                            <button className="btn-delete" onClick={() => setMessageModalOpen(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {blockModalOpen && (
                <div className="modal-backdrop" onClick={() => setBlockModalOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Block User: {blockUserName}</h2>

                        <label>Reason</label>
                        <input
                            className="blocked"
                            type="text"
                            value={blockReason}
                            onChange={(e) => setBlockReason(e.target.value)}
                            placeholder="Enter reason"
                        />

                        <label>Severity</label>
                        <select className="blocked" value={blockSeverity} onChange={(e) => setBlockSeverity(e.target.value)}>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>

                        <div className="modal-actions">
                            <button className="btn-info" onClick={submitBlockUser}>Block User</button>
                            <button className="btn-delete" onClick={() => setBlockModalOpen(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Users;
