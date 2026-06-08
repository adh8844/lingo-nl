import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Capture Schoolplein-origin flag before app boots
try {
  const params = new URLSearchParams(window.location.search);
  const host = window.location.hostname.toLowerCase();
  const referrerHost = document.referrer
    ? new URL(document.referrer).hostname.toLowerCase()
    : "";
  const hasSchoolpleinRef = params.get("ref") === "schoolplein";
  const cameFromSchoolplein = referrerHost === "schoolplein.najra.app";
  const isNajraSubdomain = host === "najra.app" || host.endsWith(".najra.app");

  if (hasSchoolpleinRef || cameFromSchoolplein || isNajraSubdomain) {
    sessionStorage.setItem("fromSchoolplein", "true");
  }

  if (hasSchoolpleinRef) {
    params.delete("ref");
    const qs = params.toString();
    window.history.replaceState(
      {},
      "",
      window.location.pathname + (qs ? "?" + qs : "") + window.location.hash,
    );
  }
} catch {
  // ignore
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

