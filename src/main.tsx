import "./brand";
import "./app.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SessionProvider } from "./app/session";
import { App } from "./app/App";

// Licht thema is standaard; donker volgt de systeeminstelling.
const media = window.matchMedia("(prefers-color-scheme: dark)");
const applyTheme = () => document.documentElement.setAttribute("data-theme", media.matches ? "dark" : "light");
applyTheme();
media.addEventListener("change", applyTheme);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SessionProvider>
      <App />
    </SessionProvider>
  </StrictMode>,
);
