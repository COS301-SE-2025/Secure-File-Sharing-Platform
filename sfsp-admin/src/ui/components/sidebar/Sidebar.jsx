import { NavLink } from "react-router-dom";
import { Shield, Users, UserX, AlertTriangle, BarChart3, ExternalLink } from "lucide-react";
import "./Sidebar.css";

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Users", url: "/users", icon: Users },
  { title: "Blocked Users", url: "/blocked-users", icon: UserX },
  { title: "Reports", url: "/reports", icon: AlertTriangle },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Shield className="logo-icon" />
        <h2>SecureShare</h2>
      </div>

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
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          onClick={() => window.open("https://secureshare.co.za", "_blank")}
          className="nav-link"
        >
          <ExternalLink className="nav-icon" />
          <span>Open Website</span>
        </button>
      </div>
    </aside>
  );
}
