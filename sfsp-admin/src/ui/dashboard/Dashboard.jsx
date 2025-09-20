import "./Dashboard.css";
import { useState } from "react";
import { Users, UserX, AlertTriangle, ExternalLink, Activity, Shield } from "lucide-react";

function Dashboard() {
  const stats = [
    { title: "Active Users", value: "2,847", icon: Users, className: "stat-success" },
    { title: "Blocked Users", value: "23", icon: UserX, className: "stat-danger" },
    { title: "Pending Reports", value: "7", icon: AlertTriangle, className: "stat-warning" },
  ];

  const [announcements, setAnnouncements] = useState([
    { action: "User blocked", user: "john.doe@example.com", time: "2 minutes ago", severity: "high",info:"this is " },
    { action: "Report resolved", user: "jane.smith@example.com", time: "15 minutes ago", severity: "medium",info:"this is " },
    { action: "New user registered", user: "mike.wilson@example.com", time: "1 hour ago", severity: "low",info:"this is " },
    { action: "File access granted", user: "sarah.jones@example.com", time: "2 hours ago", severity: "low",info:"this is " },
    { action: "File access granted", user: "sarah.jones@example.com", time: "2 hours ago", severity: "low" ,info:"this is "},
    { action: "User blocked", user: "john.doe@example.com", time: "2 minutes ago", severity: "high",info:"this is " },
    { action: "Report resolved", user: "jane.smith@example.com", time: "15 minutes ago", severity: "medium",info:"this is "},
    { action: "New user registered", user: "mike.wilson@example.com", time: "6 hour ago", severity: "low",info:"this is " },
    { action: "File access granted", user: "sarah.jones@example.com", time: "2 hours ago", severity: "low",info:"this is " },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    action: "",
    info: "",
    severity: "success",
  });
  const currentUser = "admin@example.com";

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "high": return "danger";
      case "medium": return "warning";
      default: return "success";
    }
  };

  const handleAddAnnouncement = () => {
    if (!newAnnouncement.action || !newAnnouncement.info) return;

    setAnnouncements(prev => [
      {
        ...newAnnouncement,
        user: currentUser,
        time: new Date().toLocaleTimeString()
      },
      ...prev
    ]);

    setNewAnnouncement({ action: "", info: "", severity: "success" });
    setShowModal(false);
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Secure file sharing administration portal</p>
        </div>
        <button className="btn-admin" onClick={() => window.open("https://secureshare.co.za", "_blank")}>
          <ExternalLink className="icon" /> Open Website
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={i} className={`stat-card ${stat.className}`}>
            <div>
              <p className="stat-title">{stat.title}</p>
              <p className="stat-value">{stat.value}</p>
            </div>
            <stat.icon className="stat-icon" />
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="main-grid">
        {/* Announcements */}
        <div className="card">
          <div className="card-header">
            <h2><Activity className="icon" /> Announcements</h2>
            <button className="add-btn" onClick={() => setShowModal(true)}>+</button>
          </div>
          <p className="muted">Latest actions and events in the system</p>

          <div className="activity-list">
            {announcements.map((a, i) => (
              <div key={i} className="activity-item">
                <div className="activity-info">
                  <div className={`dot ${getSeverityColor(a.severity)}`} />
                  <div>
                    <p className="activity-action">{a.action}</p>
                    <p className="activity-user">{a.user}</p>
                  </div>
                </div>
                <span className="badge">{a.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2>Quick Actions</h2>
          <p className="muted">Common administrative tasks</p>
          <div className="quick-actions">
            <button className="btn-outline"><Users className="icon" /> View All Users</button>
            <button className="btn-outline"><UserX className="icon" /> Manage Blocked Users</button>
            <button className="btn-outline"><AlertTriangle className="icon" /> Review Reports</button>
            <button className="btn-outline"><Shield className="icon" /> Security Settings</button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add Announcement</h3>

            <input
              type="text"
              placeholder="Action"
              value={newAnnouncement.action}
              onChange={e =>
                setNewAnnouncement({ ...newAnnouncement, action: e.target.value })
              }
            />

            <textarea
              placeholder="Info"
              value={newAnnouncement.info}
              onChange={e =>
                setNewAnnouncement({ ...newAnnouncement, info: e.target.value })
              }
              rows={4}
              style={{ resize: "vertical" }}
            />

            <select
              value={newAnnouncement.severity}
              onChange={e =>
                setNewAnnouncement({ ...newAnnouncement, severity: e.target.value })
              }
            >
              <option value="success">Success</option>
              <option value="info">Info</option>
              <option value="danger">Danger</option>
            </select>

            {/* Action buttons */}
            <div className="modal-actions">
              <button onClick={handleAddAnnouncement}>Add</button>
              <button onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      y
    </div>
  );
}

export default Dashboard;
