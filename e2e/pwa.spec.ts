import {test,expect} from '@playwright/test';
test('public PWA endpoints and anonymous API remain correct',async({request,page})=>{
 const manifest=await request.get('/manifest.webmanifest');expect(manifest.status()).toBe(200);expect(manifest.headers()['content-type']).toMatch(/json|manifest/);const data=await manifest.json();expect(data.display).toBe('standalone');
 for(const icon of [...data.icons,{src:'/pwa-icon/apple-180?v=1'},{src:'/pwa-icon/96?v=1'},{src:'/pwa-icon/32?v=1'}]){const r=await request.get(icon.src);expect(r.status()).toBe(200);expect(r.headers()['content-type']).toContain('image/png');expect((await r.body()).subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a')}
 const sw=await request.get('/sw.js');expect(sw.status()).toBe(200);expect(sw.headers()['content-type']).toContain('javascript');expect(sw.headers()['service-worker-allowed']).toBe('/');
 expect((await request.get('/offline')).status()).toBe(200);
 await page.goto('/login');await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href',/manifest.webmanifest/);await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content','#080a0e');await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href',/pwa-icon\/apple-180/);
 const posts=await request.get('/api/posts');expect(posts.status()).toBe(401);expect(posts.headers()['content-type']).toContain('json');
});
