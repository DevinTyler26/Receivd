import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production")
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: "src/content/index.tsx",
      name: "ReceivdContent",
      formats: ["iife"],
      fileName: () => "content.js"
    }
  }
});
