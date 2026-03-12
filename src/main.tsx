import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import App from "./App.tsx";
import "./index.css";

function showLoadError(message: string, err?: unknown) {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `
    <div style="padding:2rem;font-family:system-ui,sans-serif;max-width:600px;margin:2rem auto;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;">
      <h1 style="color:#b91c1c;margin-bottom:1rem;">Failed to load app</h1>
      <p style="color:#991b1b;margin-bottom:0.5rem;">${message}</p>
      ${err ? `<pre style="background:#fff;padding:1rem;overflow:auto;font-size:12px;margin-top:1rem;">${String(err)}</pre>` : ""}
      <p style="margin-top:1rem;color:#991b1b;">Open the browser console (F12) for details.</p>
    </div>
  `;
}

try {
  const rootEl = document.getElementById("root");
  if (!rootEl) {
    showLoadError("Root element #root not found.");
  } else {
    createRoot(rootEl).render(
      <ErrorBoundary>
        <AuthProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </AuthProvider>
      </ErrorBoundary>
    );
  }
} catch (err) {
  showLoadError("Error while starting the app.", err);
  console.error("App load error:", err);
}
