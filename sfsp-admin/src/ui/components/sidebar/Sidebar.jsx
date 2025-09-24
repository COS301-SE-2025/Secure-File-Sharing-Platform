import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Shield,
  Users,
  UserX,
  AlertTriangle,
  BarChart3,
  ExternalLink,
  LogOut,
  User,
} from "lucide-react";
import "./Sidebar.css";



const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Users", url: "/users", icon: Users },
  { title: "Blocked Users", url: "/blocked-users", icon: UserX },
  { title: "Reports", url: "/reports", icon: AlertTriangle },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const [profileModalOpen, setProfileModalOpen] = useState(false);


  function getInitials(name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Logo/Brand */}
      <div className="sidebar-header">
        <img
          src="../../src/assets/shield-full-white.png"
          alt="SecureShare Logo"
          className="logo-img clickable-logo"
          onClick={() => setCollapsed((prev) => !prev)}
        />

        {!collapsed && (
          <div className="brand-text">
            <h2>SecureShare</h2>
            <p>Admin Portal</p>
          </div>
        )}

        {!collapsed && (
          <button
            className="collapse-btn"
            onClick={() => setCollapsed((prev) => !prev)}
          >
            «
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="sidebar-section">
        {!collapsed && <p className="sidebar-label">Navigation</p>}
        <nav className="sidebar-nav">
          {navigationItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              <item.icon className="nav-icon" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Quick Actions */}
      <div className="sidebar-section">
        {!collapsed && <p className="sidebar-label">Quick Actions</p>}
        <button
          onClick={() => window.open("https://secureshare.co.za", "_blank")}
          className="nav-link"
        >
          <ExternalLink className="nav-icon" />
          {!collapsed && <span>Open Website</span>}
        </button>
      </div>

      {/* Profile Section */}
      <div className="sidebar-profile">
        {collapsed ? (
          <div className="collapsed-profile">
            <div className="avatar small">
              <span>{getInitials("Admin User")}</span>
            </div>
            <button onClick={handleLogout} className="icon-btn">
              <LogOut className="nav-icon" />
            </button>
          </div>
        ) : (
          <div className="profile-expanded">
            <div className="profile-info">
              <div className="avatar">
                <span>{getInitials("Admin User")}</span>
              </div>
              <div>
                <p className="profile-name">Admin User</p>
                <p className="profile-email">admin@secureshare.app</p>
              </div>
            </div>
            <div className="profile-actions">
              <button
                className="profile-btn"
                onClick={() => setProfileModalOpen(true)}
              >
                <User className="nav-icon" /> Profile
              </button>

              <button onClick={handleLogout} className="profile-btn">
                <LogOut className="nav-icon" /> Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {profileModalOpen && (
        <div className="modal-backdrop" onClick={() => setProfileModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">User Profile</h2>
            <div className="profile-details">
              <div className="avatar large">
                <span>{getInitials("Admin User")}</span>
              </div>
              <p>Admin User</p>
              <p>admin@secureshare.app</p>
            </div>
            <div className="profile btn-send">
              <button
                className="profile btn-info"
                onClick={() => setProfileModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>

        </div>
      )}

    </aside>
  );
}
