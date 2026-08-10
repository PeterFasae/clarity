import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// The product SPA. A source-annotating plugin from the previous toolchain used
// to sit in this plugin list; the tool is gone and so is the plugin.
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  // The Cognito SDK reaches for Node's `global`. It is only loaded when a real
  // sign-in happens, but the shim has to exist for when it is.
  define: { global: 'globalThis' },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Resolve the workspace packages to source, so a change to the engine or
      // the contract shows up in dev without a rebuild step in between.
      "@clarity/core": path.resolve(__dirname, "../../packages/core/index.ts"),
      "@clarity/retrieval": path.resolve(__dirname, "../../packages/retrieval/index.js"),
    },
  },
});
