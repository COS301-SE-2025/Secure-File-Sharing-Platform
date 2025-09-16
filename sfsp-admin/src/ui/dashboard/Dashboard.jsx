import "./Dashboard.css";
import { Users, UserX, AlertTriangle, ExternalLink, Activity, Shield } from "lucide-react";

function Dashboard() {
  const stats = [
    { title: "Active Users", value: "2,847",  icon: Users, color: "success" },
    { title: "Blocked Users", value: "23", icon: UserX, color: "danger" },
    { title: "Pending Reports", value: "7", icon: AlertTriangle, color: "warning" },

  ];

  const announcements = [
    { action: "User blocked", user: "john.doe@example.com", time: "2 minutes ago", severity: "high" },
    { action: "Report resolved", user: "jane.smith@example.com", time: "15 minutes ago", severity: "medium" },
    { action: "New user registered", user: "mike.wilson@example.com", time: "1 hour ago", severity: "low" },
    { action: "File access granted", user: "sarah.jones@example.com", time: "2 hours ago", severity: "low" }
  ];

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "high": return "danger";
      case "medium": return "warning";
      default: return "success";
    }
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
          <div key={i} className={`stat-card ${stat.color}`}>
            <div>
              <p className="stat-title">{stat.title}</p>
              <p className="stat-value">{stat.value}</p>
              <p className={`stat-change ${stat.color}`}>{stat.change}</p>
            </div>
            <stat.icon className={`stat-icon ${stat.color}`} />
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="main-grid">
        {/* Announcements */}
        <div className="card">
          <h2><Activity className="icon" /> Announcements</h2>
          <p className="muted">Latest actions and events in the system</p>
          <div className="activity-list">
            {announcements.map((a, i) => (
              <div key={i} className="activity-item">
                <div className={`dot ${getSeverityColor(a.severity)}`} />
                <div>
                  <p className="activity-action">{a.action}</p>
                  <p className="activity-user">{a.user}</p>
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
    </div>
  );
}

export default Dashboard;
