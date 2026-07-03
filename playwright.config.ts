import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: '/tmp/playwright-report' }]],
  use: {
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_PATH ||
        '/nix/store/68h63fg3qyv62lkvmqpkdk8g8qnldzhp-chromium-147.0.7727.137/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    },
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
