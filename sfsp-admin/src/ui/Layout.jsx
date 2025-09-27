import { Outlet } from "react-router-dom";
import Sidebar from "./components/sidebar/Sidebar.jsx";
import "./Layout.css";

export default function Layout() {
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <div className="app-layout">
      <Sidebar user={user}/>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
