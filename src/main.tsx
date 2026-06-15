import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// 見出し用フォント（Zen Old Mincho）。本文・データは sans のまま（docs/design.md）。
// ラテンのみ読み込む（各約19KB）。日本語見出しは OS の明朝（游明朝/ヒラギノ明朝）に
// フォールバックさせ、日本語フォント約2MB/ウェイトの巨大ダウンロードを避ける。
import "@fontsource/zen-old-mincho/latin-500.css";
import "@fontsource/zen-old-mincho/latin-700.css";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./features/auth/AuthContext";
import { AppDataProvider } from "./store/AppDataContext";
import { OverlayProvider } from "./store/OverlayContext";

// 個人専用ツールなので頻繁な再取得は不要。フォーカス時の自動再取得は止める。
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppDataProvider>
          <OverlayProvider>
            <App />
          </OverlayProvider>
        </AppDataProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
