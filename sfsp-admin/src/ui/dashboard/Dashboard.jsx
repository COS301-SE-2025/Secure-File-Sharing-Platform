import "./Dashboard.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserX, AlertTriangle, ExternalLink, Activity, Shield, Trash2 } from "lucide-react";
import { adminFetch } from '../../api/api_config.js';

// const navigationItems = [
//   { title: "Dashboard", url: "/dashboard" },
//   { title: "Users", url: "/users" },
//   { title: "Blocked Users", url: "/blocked-users" },
//   { title: "Reports", url: "/reports" },
// ];

function Dashboard() {
  const [stats, setStats] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [manageModal, setManageModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    action: "",
    info: " ",
    severity: "success",
  });
  const [infoModal, setInfoModal] = useState({ show: false, announcement: null });
  const navigate = useNavigate();



  const user = JSON.parse(localStorage.getItem("user"));
  const currentUser = user.email;

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "high": return "danger";
      case "medium": return "warning";
      default: return "success";
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await adminFetch("/dashboard/stats");
        const data = res;
        if (data.success) {
          setStats([
            { title: "Active Users", value: data.stats.totalUsers, icon: Users, className: "stat-success" },
            { title: "Blocked Users", value: data.stats.blockedUsers, icon: UserX, className: "stat-danger" },
            { title: "Pending Reports", value: data.stats.pendingReports, icon: AlertTriangle, className: "stat-warning" }
          ]);
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await adminFetch("/announcements");
        const data = res;
        if (data.success) setAnnouncements(data.announcements);
      } catch (err) {
        console.error("Failed to fetch announcements:", err);
      }
    };
    fetchAnnouncements();
  }, []);

  const handleAddAnnouncement = async () => {
    if (!newAnnouncement.action) return;

    const payload = { ...newAnnouncement, user: currentUser, info: newAnnouncement.info.trim() === "" ? "No details" : newAnnouncement.info };
    try {
      const res = await adminFetch("/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = res;
      if (data.success) {
        setAnnouncements(prev => [data.announcement, ...prev]);
        setNewAnnouncement({ action: "", info: "", severity: "success" });
        setShowModal(false);
      }
    } catch (err) {
      console.error("Failed to add announcement:", err);
    }
  };

  const handleManageAnnouncements = () => {
    setManageModal(true);
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/announcements/${id}`, {
        method: "DELETE"
      });
      const data = res;
      if (data.success) {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete announcement:", err);
    }
  };

  const userAnnouncements = announcements.filter(a => a.user === currentUser);

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
        <div className="stat-card stat-success">
          <div>
            <p className="stat-title">Active Users</p>
            <p className="stat-value">{stats[0]?.value ?? 0}</p>
          </div>
          <Users className="stat-icon" />
        </div>
        <div className="stat-card stat-danger">
          <div>
            <p className="stat-title">Blocked Users</p>
            <p className="stat-value">{stats[1]?.value ?? 0}</p>
          </div>
          <UserX className="stat-icon" />
        </div>
        <div className="stat-card stat-warning">
          <div>
            <p className="stat-title">Pending Reports</p>
            <p className="stat-value">{stats[2]?.value ?? 0}</p>
          </div>
          <AlertTriangle className="stat-icon" />
        </div>
      </div>


      {/* Main Grid */}
      <div className="main-grid">
        {/* Announcements */}
        <div className="card">
          <div className="card-header">
            <h2><Activity className="icon" /> Announcements</h2>
            <div className="card-header-buttons">
              <button className="add-btn" onClick={() => setShowModal(true)}>+</button>
              <button className="manage-btn" onClick={handleManageAnnouncements}>Manage</button>
            </div>
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
                <div className="timestamp-info">
                  <span className="badge">{new Date(a.created_at).toLocaleString()}</span>
                  <button className="info-btn" onClick={() => setInfoModal({ show: true, announcement: a })}>i</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2>Quick Actions</h2>
          <p className="muted">Common administrative tasks</p>
          <div className="quick-actions">
            <button className="btn-outline" onClick={() => navigate("/users")}><Users className="icon" /> View All Users</button>
            <button className="btn-outline" onClick={() => navigate("/blocked-users")}><UserX className="icon" /> Manage Blocked Users</button>
            <button className="btn-outline" onClick={() => navigate("/reports")} ><AlertTriangle className="icon" /> Review Reports</button>
          </div>
        </div>
      </div>

      {/* Add Announcement Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add Announcement</h3>
            <input
              type="text"
              placeholder="Action"
              value={newAnnouncement.action}
              onChange={e => setNewAnnouncement({ ...newAnnouncement, action: e.target.value })}
            />
            <textarea
              placeholder="Info"
              value={newAnnouncement.info}
              onChange={e => setNewAnnouncement({ ...newAnnouncement, info: e.target.value })}
              rows={4}
              style={{ resize: "vertical" }}
            />
            <select
              value={newAnnouncement.severity}
              onChange={e => setNewAnnouncement({ ...newAnnouncement, severity: e.target.value })}
            >
              <option value="success">Success</option>
              <option value="medium">Medium</option>
              <option value="high">Danger</option>
            </select>
            <div className="modal-actions">
              <button onClick={handleAddAnnouncement}>Add</button>
              <button onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Info Modal */}
      {infoModal.show && infoModal.announcement && (
        <div className="modal-backdrop" onClick={() => setInfoModal({ show: false, announcement: null })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Announcement Details</h3>
            <p><strong>Action:</strong> {infoModal.announcement.action}</p>
            <p><strong>Info:</strong> {infoModal.announcement.info}</p>
            <p><strong>User:</strong> {infoModal.announcement.user}</p>
            <p><strong>Severity:</strong> {infoModal.announcement.severity}</p>
            <p><strong>Time:</strong> {new Date(infoModal.announcement.created_at).toLocaleString()}</p>
            <div className="modal-actions">
              <button onClick={() => setInfoModal({ show: false, announcement: null })}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Announcements Modal */}
      {manageModal && (
        <div className="modal-backdrop" onClick={() => setManageModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Manage Your Announcements</h3>
            {userAnnouncements.length === 0 ? (
              <p>No announcements posted by you.</p>
            ) : (
              <ul className="manage-list">
                {userAnnouncements.map(a => (
                  <li key={a.id} className="manage-item">
                    <div>
                      <span className={`dot ${getSeverityColor(a.severity)}`} style={{ marginLeft: "8px" }} />
                      <strong>{a.action} :</strong>{a.info}
                    </div>
                    <button className="btn-delete" onClick={() => handleDeleteAnnouncement(a.id)}>
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="modal-actions">
              <button onClick={() => setManageModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
