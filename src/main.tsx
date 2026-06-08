import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Capture schoolplein referrer flag before app boots
try {
  const params = new URLSearchParams(window.location.search);
  if (params.get("ref") === "schoolplein") {
    sessionStorage.setItem("fromSchoolplein", "true");
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

