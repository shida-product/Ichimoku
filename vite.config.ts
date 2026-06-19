import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // GitHub Pages は https://shida-product.github.io/Ichimoku/ で配信されるため
  // base をリポジトリ名に合わせる。
  base: "/Ichimoku/",
  build: {
    outDir: "dist",
    minify: false,
  },
});
