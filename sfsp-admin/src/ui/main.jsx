import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import Root from "./Root.jsx";

createRoot(document.getElementById("root")).render(

  <BrowserRouter>
    <Root />
  </BrowserRouter>

);
