import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/web",
  use: { baseURL: "http://127.0.0.1:3187", browserName: "chromium" },
  webServer: {
    command: "npm run build && npm start",
    url: "http://127.0.0.1:3187/web/",
    env: { PORT: "3187" },
    reuseExistingServer: false,
  },
});
