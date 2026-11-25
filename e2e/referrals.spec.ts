import {test,expect} from '@playwright/test';
test('referral APIs reject unauthenticated access',async({request})=>{for(const path of ['/api/referrals','/api/leaderboard','/api/admin/referrals']){const r=await request.get(path);expect(r.status()).toBe(401);expect(r.headers()['content-type']).toContain('json')}const invalid=await request.get('/r/invalid-code',{maxRedirects:0});expect([302,307,308]).toContain(invalid.status());expect(invalid.headers()['location']).toContain('/login');expect(invalid.headers()['set-cookie']||'').not.toContain('cc_referral=')});

test.use({serviceWorkers:'block'});
test('referral workspace, podium, enabled rewards and profile navigation render using test API fixtures',async({page,context})=>{
 const now=Date.now(),competition={id:'qa-competition',title:'QA competition',status:'active',startAt:now-60000,endAt:now+86400000,rulesVersion:1};
 const rows=Array.from({length:4},(_,i)=>({rank:i+1,student:{handle:'qa'+(i+1),name:'QA student '+(i+1),avatarUrl:null},count:4-i,self:i===3}));
 const code='CC-S4LA',link='https://campusconnectbvm.online/r/'+code;
 await context.grantPermissions(['clipboard-read','clipboard-write']);
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/chat/token')return route.fulfill({status:403,json:{error:'Disabled in test'}});
  if(path==='/api/auth')return route.fulfill({json:{user:{uid:'qa-user',profile:{handle:'qa4',name:'QA student 4',avatarMediaId:null}}}});
  if(path==='/api/profile/me')return route.fulfill({json:{self:true,profile:{handle:'qa4',name:'QA student 4',branch:'Electronics',division:'',avatarMediaId:null},posts:[],reposts:[],tagged:[],highlights:[]}});
  if(path==='/api/leaderboard')return route.fulfill({json:{competition,competitions:[competition],rows,podium:rows.slice(0,3),me:{rank:4,count:1,lifetime:1,needed:2},hasMore:false,serverNow:now,admin:false}});
  if(path==='/api/referrals')return route.fulfill({json:route.request().method()==='POST'?{status:'closed'}:{code,link,lifetime:1,history:[],hasMore:false}});
  if(path==='/api/push')return route.fulfill({json:{enabled:false,registered:false,config:null}});
  if(path==='/api/notifications/summary')return route.fulfill({json:{unread:0,unreadMessages:0}});
  return route.fulfill({json:{items:[],conversations:[],members:[]}});
 });
 await page.goto('/profile/me');
 await expect(page.getByRole('link',{name:'Referral link',exact:true})).toBeVisible();
 await expect(page.getByLabel('Your referral code')).toHaveCount(0);
 await page.getByRole('link',{name:'Referral link',exact:true}).click();
 await expect(page).toHaveURL(/\/leaderboard\?tab=referral/);
 await expect(page.getByRole('link',{name:'Rewards',exact:true})).toBeEnabled();
 await expect(page.getByLabel('Your referral code')).toHaveValue(code);
 await expect(page.getByLabel('Your referral link')).toHaveValue(link);
 await page.getByRole('button',{name:'Copy code',exact:true}).click();
 await expect(page.getByText('Copied successfully')).toBeVisible();
 expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(code);
 await page.getByRole('button',{name:'Copy link',exact:true}).click();
 expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(link);
 expect(new URL(link).pathname).toBe('/r/'+code);
 const wa=await page.getByRole('link',{name:'WhatsApp',exact:true}).getAttribute('href');
 expect(decodeURIComponent(wa||'')).toContain(link);
 await page.getByRole('link',{name:'Back to leaderboard'}).click();
 await expect(page.locator('.cc-board-podium')).toContainText('QA student 1');
 await expect(page.locator('.cc-board-list')).toContainText('QA student 4');
 await expect(page.locator('.cc-board-list')).not.toContainText('QA student 1');
 await expect(page.getByLabel('Your referral code')).toHaveCount(0);
 await page.getByRole('link',{name:'Rewards',exact:true}).click();
 await expect(page).toHaveURL(/tab=rewards/);
 await expect(page.locator('.cc-reward-card')).toHaveCount(5);
 for(const [i,name] of ['Black hoodie','Wireless earbuds','Plain black T-shirt','Steel water bottle','The Alchemist'].entries()){const card=page.locator('.cc-reward-card').nth(i);await expect(card.getByRole('heading',{name,exact:true})).toBeVisible();await expect.poll(()=>card.locator('img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0)}
 const hoodie=page.locator('.cc-reward-rank-1 .cc-reward-photo img');
 await expect.poll(()=>hoodie.evaluate((img:HTMLImageElement)=>[img.naturalWidth,img.naturalHeight])).toEqual([2048,2048]);
 const tshirt=page.locator('.cc-reward-rank-3 .cc-reward-photo img');
 await expect.poll(()=>tshirt.evaluate((img:HTMLImageElement)=>[img.naturalWidth,img.naturalHeight])).toEqual([2048,2048]);
 const checkRewardFrame=async(image:typeof hoodie)=>{const geometry=await image.evaluate((img:HTMLImageElement)=>{const photo=img.parentElement!;const a=img.getBoundingClientRect(),b=photo.getBoundingClientRect();const css=getComputedStyle(img);return {contained:a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1,centered:Math.abs((a.left+a.right-b.left-b.right)/2)<=1&&Math.abs((a.top+a.bottom-b.top-b.bottom)/2)<=1,square:Math.abs(b.width-b.height)<=1,fit:css.objectFit,position:css.objectPosition}});expect(geometry).toEqual({contained:true,centered:true,square:true,fit:'contain',position:'50% 50%'})};
 await checkRewardFrame(hoodie);
 await checkRewardFrame(tshirt);
 await page.setViewportSize({width:390,height:844});
 await checkRewardFrame(hoodie);
 await checkRewardFrame(tshirt);
 await expect(page.getByRole('link',{name:'Rewards',exact:true})).toBeVisible();
 expect(await page.locator('.cc-board-v2').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
});
test('short manual referral code is sent through authenticated onboarding UI',async({page})=>{
 let claimed=false;
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/auth')return route.fulfill({json:{user:{uid:'qa-new',profile:{handle:'qa-new',name:'QA new',avatarMediaId:null}}}});
  if(path==='/api/chat/token')return route.fulfill({status:403,json:{error:'Disabled in test'}});
  if(path==='/api/referrals'&&route.request().method()==='POST'){
   const body=route.request().postDataJSON();
   if(body.action==='apply'){expect(body.code).toBe('CC-15UD');claimed=true;return route.fulfill({json:{status:'applied'}})}
   return route.fulfill({json:{status:'pending'}});
  }
  if(path==='/api/leaderboard')return route.fulfill({json:{competition:null,competitions:[],rows:[],podium:[],me:{rank:null,count:0,lifetime:0,needed:null},hasMore:false,serverNow:Date.now(),admin:false}});
  return route.fulfill({json:{items:[],conversations:[],members:[]}});
 });
 await page.goto('/leaderboard');
 await page.getByLabel('Referral code',{exact:true}).fill('cc-15ud');
 await page.getByRole('button',{name:'Apply code'}).click();
 await expect(page.getByText('Referral code applied successfully!')).toBeVisible();
 expect(claimed).toBe(true);
 await expect(page.getByRole('button',{name:'Apply code'})).toHaveCount(0);
});
