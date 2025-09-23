import React from "react";
import { createRoot } from "react-dom/client";
import Root from "./Root.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);



// import { createRoot } from "react-dom/client";
// import { BrowserRouter } from "react-router-dom";
// import "./index.css";
// import Root from "./Root.jsx";

// createRoot(document.getElementById("root")).render(

//   <BrowserRouter>
//     <Root />
//   </BrowserRouter>

// );
