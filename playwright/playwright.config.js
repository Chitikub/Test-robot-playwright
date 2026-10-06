const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  expect: {
    timeout: 20_000,
  },
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    headless: true,
    baseURL: "https://moodlocation.vercel.app",
    trace: "on-first-retry",
    screenshot: "on",
    video: "on",
    launchOptions: {
      slowMo: 250,
    },
  },
});
