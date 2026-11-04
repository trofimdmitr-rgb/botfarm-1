// Автотесты в имитации Telegram: npm run e2e (сам соберёт приложение и запустит локальный сервер)
import { defineConfig } from "@playwright/test";

const touch = { isMobile: true, hasTouch: true };

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1, // одна база в памяти на все тесты
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e-report" }]],
  outputDir: "e2e-results",
  use: {
    baseURL: "http://localhost:8787",
    locale: "ru-RU",
    timezoneId: "Europe/Samara",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "iphone-13", use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, ...touch } },
    { name: "android-small", use: { viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, ...touch } },
    { name: "android-large", use: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, ...touch } },
    { name: "desktop-telegram", use: { viewport: { width: 420, height: 720 }, deviceScaleFactor: 1 } },
  ],
  webServer: {
    command: "npm run build && npm run local",
    url: "http://localhost:8787/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
