import { Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import Dashboard from "./dashboard/Dashboard.jsx";
import Users from "./users/Users.jsx";
import Layout from "./Layout.jsx";

export default function Root() {
  return (
    <Routes>
      <Route path="/" element={<App />} />

      <Route path="/" element={<Layout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<Users />} />
      </Route>
    </Routes>
  );
}
