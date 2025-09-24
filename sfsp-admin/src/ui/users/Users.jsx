import { useState } from "react";
import { Users as UsersIcon, Search, Trash2, Mail, Info, Shield, Settings, CheckCircle, XCircle } from "lucide-react";
import "./Users.css";

const Users = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
    const [newAdminUsername, setNewAdminUsername] = useState("");
    const [newAdminEmail, setNewAdminEmail] = useState("");
    const [toastMessage, setToastMessage] = useState("");
    const [infoModalOpen, setInfoModalOpen] = useState(false);
    const [messageModalOpen, setMessageModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const usersData = [
        { id: 1, username: "johnsmith", name: "John Smith", email: "john.smith@example.com", avatar: "", role: "admin", verified: true, status: "Active", joinDate: "2024-01-15", lastAccess: "2 hours ago", filesShared: 45 },
        { id: 2, username: "sarahjohnson", name: "Sarah Johnson", email: "sarah.johnson@example.com", avatar: "", role: "admin", verified: true, status: "Active", joinDate: "2024-02-10", lastAccess: "1 day ago", filesShared: 23 },
        { id: 3, username: "mikewilson", name: "Mike Wilson", email: "mike.wilson@example.com", avatar: "", role: "admin", verified: false, status: "Inactive", joinDate: "2024-01-20", lastAccess: "1 week ago", filesShared: 67 },
        { id: 4, username: "emmadavis", name: "Emma Davis", email: "emma.davis@example.com", avatar: "", role: "admin", verified: true, status: "Active", joinDate: "2024-03-05", lastAccess: "30 minutes ago", filesShared: 12 },
        { id: 5, username: "alexbrown", name: "Alex Brown", email: "alex.brown@example.com", avatar: "", role: "admin", verified: true, status: "Active", joinDate: "2024-02-20", lastAccess: "5 minutes ago", filesShared: 89 }
    ];

    const [users, setUsers] = useState(usersData);

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalUsers = users.length;
    const totalAdminUsers = users.filter(user => user.role === "admin").length;

    const handleDeleteUser = (userId, userName) => {
        setUsers(prev => prev.filter(u => u.id !== userId));
        setToastMessage(`${userName} has been removed from the system`);
        setTimeout(() => setToastMessage(""), 3000);
    };

    const handleSendMessage = (user) => {
        setSelectedUser(user);
        setMessageModalOpen(true);
    };

    const handleViewInfo = (user) => {
        setSelectedUser(user);
        setInfoModalOpen(true);
    };

    const handleCreateAdmin = () => {
        if (!newAdminUsername || !newAdminEmail) {
            setToastMessage("Please fill in all fields");
            setTimeout(() => setToastMessage(""), 3000);
            return;
        }
        setUsers(prev => [
            { id: Date.now(), username: newAdminUsername, name: newAdminUsername, email: newAdminEmail, avatar: "/placeholder.svg", role: "admin", verified: false, status: "Active", joinDate: new Date().toISOString().split("T")[0], lastAccess: "just now", filesShared: 0 },
            ...prev
        ]);
        setToastMessage(`${newAdminUsername} has been granted admin privileges`);
        setNewAdminUsername("");
        setNewAdminEmail("");
        setIsAdminDialogOpen(false);
        setTimeout(() => setToastMessage(""), 3000);
    };

    const handleRoleChange = (userId, newRole) => {
        setUsers((prevUsers) =>
            prevUsers.map((user) =>
                user.id === userId ? { ...user, role: newRole } : user
            )
        );
        setToastMessage(`User role updated to ${newRole}`);
        setTimeout(() => setToastMessage(""), 3000);
    };

    const getRoleColor = (role) => role === "admin" ? "role-admin" : "role-general";

    return (
        <div className="users-page">
            {toastMessage && <div className="toast">{toastMessage}</div>}

            {/* Header */}
            <div className="header">
                <h1><UsersIcon className="icon" /> User Management</h1>
                <p>Manage and monitor all platform users</p>
            </div>

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
                                                        {admin.name
                                                            .split(" ")
                                                            .map((n) => n[0])
                                                            .join("")}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="admin-name">{admin.name}</p>
                                                    <p className="admin-username">@{admin.username}</p>
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
                                    <span className={`role-badge ${getRoleColor(user.role)}`}>{user.role}</span>
                                </td>
                                <td>
                                    {user.verified ? (
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
                                    <button className="btn-delete" onClick={() => handleDeleteUser(user.id, user.name)} title="Delete User">
                                        <Trash2 className="icon-action" />
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
                        <h2>{selectedUser.name} Info</h2>
                        <p><strong>Username:</strong> @{selectedUser.username}</p>
                        <p><strong>Email:</strong> {selectedUser.email}</p>
                        <p><strong>Role:</strong> {selectedUser.role}</p>
                        <p><strong>Verified:</strong> {selectedUser.verified ? "Yes" : "No"}</p>
                        <button className="btn-close" onClick={() => setInfoModalOpen(false)}>Close</button>
                    </div>
                </div>
            )}

            {/* Message Modal */}
            {messageModalOpen && selectedUser && (
                <div className="modal-backdrop" onClick={() => setMessageModalOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Send Message to {selectedUser.name}</h2>
                        <textarea placeholder="Type your message here..." className="message-input" />
                        <div className="btn-send">
                            <button
                                className="btn-info"
                                onClick={() => {
                                    setToastMessage(`Message sent to ${selectedUser.name}`);
                                    setTimeout(() => setToastMessage(""), 3000);
                                    setMessageModalOpen(false);
                                }}
                            >
                                Send
                            </button>
                            <button className="btn-delete" onClick={() => setMessageModalOpen(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
