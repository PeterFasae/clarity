import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const repoRoot = path.resolve(__dirname, "../..");

// Standalone marketing site. No proxy, no backend — every page is fully static.
// Two things it does import from outside itself:
//   @clarity/retrieval — so the demo runs the same engine the product runs
//   @status            — docs/status.json, so no label on this site can rot
export default defineConfig({
  server: {
    host: "::",
    port: 8081,
    fs: { allow: [repoRoot] },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@clarity/retrieval": path.join(repoRoot, "packages/retrieval/index.js"),
      "@status": path.join(repoRoot, "docs/status.json"),
    },
  },
});
