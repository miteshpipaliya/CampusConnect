import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
test('new recording plays from Enter Campus, reveals aligned captions, and gates account options until ended',async({page,request})=>{
 test.setTimeout(80000);
 const response=await request.get('/audio/introduction.mp3');expect(response.ok()).toBeTruthy();expect((await response.body()).length).toBe(565299);
 const actions:string[]=[];
 await page.route('**/api/introduction',async r=>{const a=r.request().method()==='POST'?r.request().postDataJSON().action:'status';actions.push(a);return r.fulfill({json:{completed:a==='finish'}})});
 await page.route('**/api/auth',r=>r.fulfill({status:401,json:{error:'Sign in required'}}));
 await page.setViewportSize({width:1440,height:900});await page.goto('/');await page.getByRole('link',{name:'ENTER CAMPUS'}).click();await expect(page).toHaveURL(/\/enter$/);const dialog=page.locator('.cc-intro-dialogue');await expect(dialog).toBeVisible();
 const caption=page.locator('.cc-intro-transcript');await expect(caption).toContainText('Welcome to CampusConnect!',{timeout:10000});
 await expect(page.getByRole('link',{name:'Log in',exact:true})).toHaveCount(0);await expect(page.getByRole('link',{name:'Sign up with BVM email'})).toHaveCount(0);
 await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(0);
 expect(await page.locator('audio').evaluate((a:HTMLAudioElement)=>Math.abs(a.duration-34.272625)<.2)).toBeTruthy();
 for(const [width,height] of [[1440,900],[768,1024],[390,844],[3840,2160]] as const){await page.setViewportSize({width,height});const b=await dialog.boundingBox();expect(b).not.toBeNull();const visibleWidth=await page.evaluate(()=>document.documentElement.clientWidth);expect(Math.abs((b!.x+b!.width/2)-visibleWidth/2)).toBeLessThan(2);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()}
 await expect(caption).toContainText('Your Campus journey starts from now.',{timeout:45000});await expect(page.getByRole('link',{name:'Log in',exact:true})).toBeVisible({timeout:10000});expect(actions.filter(a=>a==='start')).toHaveLength(1);expect(actions.filter(a=>a==='finish')).toHaveLength(1);
});

test('proof service outage does not prevent actual playback or captions, and does not reveal auth early',async({page})=>{test.setTimeout(80000);await page.route('**/api/introduction',r=>r.fulfill({status:503,json:{error:'Introduction service unavailable'}}));await page.route('**/api/auth',r=>r.fulfill({status:401,json:{error:'Sign in required'}}));await page.goto('/');await page.getByRole('link',{name:'ENTER CAMPUS'}).click();await expect(page.locator('.cc-intro-transcript')).toContainText('Welcome to CampusConnect!',{timeout:10000});await expect(page.getByRole('link',{name:'Log in',exact:true})).toHaveCount(0);await expect(page.locator('.cc-intro-transcript')).toContainText('Your Campus journey starts from now.',{timeout:45000});await expect(page.getByRole('link',{name:'Log in',exact:true})).toBeVisible({timeout:12000})});
