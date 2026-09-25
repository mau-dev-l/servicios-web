import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/web",
  use: { baseURL: "http://127.0.0.1:3187", browserName: "chromium" },
  webServer: {
    command: "npm --prefix frontend run dev -- --host 127.0.0.1 --port 3187",
    url: "http://127.0.0.1:3187/",
    reuseExistingServer: false,
  },
});
