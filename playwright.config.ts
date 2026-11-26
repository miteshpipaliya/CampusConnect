import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',fullyParallel:true,forbidOnly:Boolean(process.env.CI),retries:process.env.CI?1:0,
 reporter:'list',use:{baseURL:'http://localhost:3000',trace:'off'},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
 webServer:{command:'npm run start -- --hostname localhost --port 3000',url:'http://localhost:3000/',env:{OTP_SIGNING_SECRET:'local-playwright-intro-fixture-not-production'},reuseExistingServer:false,timeout:120000}
});
