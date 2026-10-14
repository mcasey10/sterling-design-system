// Builds the sterling-ui package's JavaScript and component CSS (ui/scripts/build-package.mjs runs it).
// One ES module and one CSS file. React and the React Aria packages stay outside the bundle: the application
// installs them.

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: resolve(here, "package/dist"),
    emptyOutDir: true,
    sourcemap: false,
    minify: false,
    cssCodeSplit: false,
    lib: { entry: resolve(here, "src/index.ts"), formats: ["es"], fileName: "index", cssFileName: "components" },
    rollupOptions: { external: ["react", "react-dom", "react/jsx-runtime", "react-aria", "react-stately"] },
  },
});
