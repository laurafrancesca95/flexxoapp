import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./": de app werkt op elk pad (GitHub Pages /flexxoapp/, Vercel, later Azure).
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { host: true },
});
