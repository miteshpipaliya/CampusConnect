import {completedIntroduction} from './intro-fixture';
import {test,expect,type Page} from '@playwright/test';
test.use({serviceWorkers:'block'});
async function geometry(page:Page){
 return page.evaluate(()=>{const scene=document.querySelector('.cc-campus-scene')!;const img=scene.querySelector('img')!;const b=scene.getBoundingClientRect(),i=img.getBoundingClientRect(),root=document.documentElement;return {scene:[b.x,b.y,b.width,b.height],image:[i.x,i.y,i.width,i.height],fit:getComputedStyle(img).objectFit,position:getComputedStyle(img).objectPosition,viewport:[innerWidth,innerHeight],document:[root.scrollWidth,root.scrollHeight],scroll:[scrollX,scrollY]}});
}
async function fixedPage(page:Page){const g=await geometry(page);expect(g.scene).toEqual([0,0,...g.viewport]);expect(g.document).toEqual(g.viewport);expect(g.scroll).toEqual([0,0]);expect(g.fit).toBe('cover');return g;}
test('email detection and a login error cannot resize the campus background or scroll the page',async({page})=>{
 await completedIntroduction(page);
 await page.route('**/api/auth',r=>r.fulfill({status:429,json:{error:'Too many requests. Please try again later.'}}));
 for(const [width,height] of [[1518,695],[1366,768],[1440,900],[390,844],[320,568]] as const){
  await page.setViewportSize({width,height});await page.goto('/login');
  const email=page.getByLabel('BVM student email or approved tester'),password=page.getByLabel('Password',{exact:true});
  await email.fill('26el309@bvmengineering.ac.');await expect(page.getByText('Student details detected')).toHaveCount(0);
  const before=await fixedPage(page);
  await email.fill('26el309@bvmengineering.ac.in');await expect(page.getByText('Student details detected')).toBeVisible();
  expect(await fixedPage(page)).toEqual(before);
  await password.fill('FixturePassword!123');const submit=page.getByRole('button',{name:'Sign in',exact:true});await submit.click();
  await expect(page.getByRole('status')).toContainText('Too many requests');expect(await fixedPage(page)).toEqual(before);
  await expect(page.getByRole('link',{name:'Sign up with BVM email'})).toBeVisible();
 }
});
test('welcome and login fill the viewport without document scrolling',async({page})=>{
 await completedIntroduction(page);
 await page.route('**/api/introduction',r=>r.fulfill({json:{completed:true}}));await page.route('**/api/auth',r=>r.fulfill({status:401,json:{error:'Sign in required'}}));
 for(const [width,height] of [[1518,695],[1920,1080],[3840,2160],[768,1024],[390,844],[320,568],[844,390]] as const){
  await page.setViewportSize({width,height});await page.goto('/');await fixedPage(page);
  await page.getByRole('link',{name:'ENTER CAMPUS'}).click();await expect(page).toHaveURL(/\/login$/);await expect(page.getByLabel('Password',{exact:true})).toBeVisible();await fixedPage(page);
  await page.getByRole('link',{name:'Sign up with BVM email'}).click();await expect(page.getByLabel('BVM student email or approved tester')).toBeVisible();await fixedPage(page);
 }
});

test('welcome typography and compact official logo stay inside their own space',async({page})=>{
 for(const [width,height] of [[1518,695],[1366,768],[1920,1080],[3840,2160],[768,1024],[390,844],[320,568],[844,390]] as const){
  await page.setViewportSize({width,height});await page.goto('/');await fixedPage(page);
  const brand=page.locator('.cc-campus-entry-header .cc-campus-official-brand'),logo=brand.locator('img'),title=page.locator('.cc-campus-entry-title'),cta=page.getByRole('link',{name:'ENTER CAMPUS'});
  await expect(logo).toHaveAttribute('src','/cc-mark.svg');await expect(title.getByRole('heading',{name:'BVM',exact:true})).toBeVisible();
  const b=(await brand.boundingBox())!,l=(await logo.boundingBox())!,t=(await title.boundingBox())!,c=(await cta.boundingBox())!;
  expect(l.width).toBeLessThanOrEqual(57);expect(Math.abs(l.width-l.height)).toBeLessThan(1);
  expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(width);
  expect(t.x).toBeGreaterThanOrEqual(0);expect(t.x+t.width).toBeLessThanOrEqual(width+1);
  expect(t.y+t.height).toBeLessThan(c.y);expect(c.y+c.height).toBeLessThanOrEqual(height);
  expect(b.x+b.width<=t.x||b.y+b.height<=t.y).toBeTruthy();
 }
});
