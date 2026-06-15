import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./features/auth/AuthContext";
import { AppDataProvider } from "./store/AppDataContext";
import { OverlayProvider } from "./store/OverlayContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <AppDataProvider>
        <OverlayProvider>
          <App />
        </OverlayProvider>
      </AppDataProvider>
    </AuthProvider>
  </StrictMode>
);
