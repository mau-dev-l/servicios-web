import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, "PORT");
  return {
    root: fileURLToPath(new URL("./frontend", import.meta.url)),
    base: "/web/",
    plugins: [react()],
    server: {
      proxy: {
        "^/(register|login|users)(/|$)": `http://127.0.0.1:${env.PORT || 3000}`,
      },
    },
    build: { outDir: "../dist", emptyOutDir: true },
  };
});
