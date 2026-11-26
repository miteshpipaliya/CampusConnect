import {completedIntroduction} from './intro-fixture';
import {test,expect} from '@playwright/test';
test('login renders and security headers are present',async({page})=>{
 await completedIntroduction(page);
 const response=await page.goto('/login');
 expect(response?.status()).toBe(200);
 await expect(page.locator('body')).toBeVisible();
 await expect(page.locator('input[type="email"]')).toBeVisible();
 expect(response?.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
 expect(response?.headers()['x-content-type-options']).toBe('nosniff');
});
test('anonymous posts request is rejected as JSON',async({request})=>{
 const response=await request.get('/api/posts');
 expect(response.status()).toBe(401);
 expect(response.headers()['content-type']).toContain('application/json');
 expect(await response.json()).toHaveProperty('error');
});
test('cron rejects requests without authorization',async({request})=>{
 const response=await request.get('/api/cron/cleanup');
 expect([401,503]).toContain(response.status());
 expect(await response.json()).toHaveProperty('error');
});

test('unverified visitors cannot skip the introduction via direct login or registration',async({page})=>{for(const path of ['/login','/register']){await page.goto(path);await expect(page).toHaveURL(/\/$/);await expect(page.getByRole('link',{name:'ENTER CAMPUS'})).toBeVisible();await expect(page.locator('input[type=password]')).toHaveCount(0)}});
