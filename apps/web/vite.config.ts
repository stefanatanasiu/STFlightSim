import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const isolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp"
};

export default defineConfig({
  plugins: [react()],
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
    chunkSizeWarningLimit: 650,
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
