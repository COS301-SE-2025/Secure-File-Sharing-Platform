import { useEffect } from "react";
import { Routes, Route, HashRouter, BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import Dashboard from "./dashboard/Dashboard.jsx";
import Users from "./users/Users.jsx";
import Layout from "./Layout.jsx";
import BlockedUsers from "./blockedUsers/blockedUsers.jsx";
import Reports from "./reports/Reports.jsx";

const Router = window.location.protocol === "file:" ? HashRouter : BrowserRouter;

export default function Root() {
  useEffect(() => {
    const disableContextMenu = (e) => e.preventDefault();
    window.addEventListener("contextmenu", disableContextMenu);

    return () => {
      window.removeEventListener("contextmenu", disableContextMenu);
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/" element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="blocked-users" element={<BlockedUsers />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Routes>
    </Router>
  );
}