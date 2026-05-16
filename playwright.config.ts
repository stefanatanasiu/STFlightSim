import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results/playwright",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: "http://127.0.0.1:5173/",
    channel: "msedge",
    trace: "on-first-retry",
    viewport: { width: 1440, height: 900 }
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5173/",
    reuseExistingServer: true,
    timeout: 120_000
  },
  projects: [
    {
      name: "edge-desktop",
      use: { ...devices["Desktop Edge"] }
    }
  ]
});
