import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const isolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp"
};

export default defineConfig({
  plugins: [react()],
  envDir: fileURLToPath(new URL("../..", import.meta.url)),
  server: {
    port: 5173,
    headers: isolationHeaders
  },
  preview: {
    port: 4173,
    headers: isolationHeaders
  },
  optimizeDeps: {
    include: ["three", "react", "react-dom", "lucide-react"]
  },
  build: {
    chunkSizeWarningLimit: 2600,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          three: ["three"],
          icons: ["lucide-react"]
        }
      }
    }
  }
});
