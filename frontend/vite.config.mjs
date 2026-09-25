import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_URL?.replace(/\/$/, "");

  return {
    base: "/",
    plugins: [react()],
    server: {
      ...(apiUrl ? {} : {
        proxy: {
          "^/(register|login|users)(/|$)": `http://127.0.0.1:${env.API_PORT || 3000}`,
        },
      }),
    },
  };
});
