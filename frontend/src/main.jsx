import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(() => console.log("✅ SW registered"))
      .catch(err => console.warn("SW:", err));
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode><App /></StrictMode>
);
