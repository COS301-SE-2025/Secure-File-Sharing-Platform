import { Outlet } from "react-router-dom";
import Sidebar from "./components/sidebar/Sidebar.jsx";
import "./Layout.css";

export default function Layout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
