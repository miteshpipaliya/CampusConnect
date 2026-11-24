import {test,expect} from '@playwright/test';
test('Explore is a full page with a keyboard-accessible search dropdown and monochrome mark',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;const data=path==='/api/auth'?{user:{uid:'mock-shell',profile:{handle:'mockuser',avatarMediaId:null}}}:path==='/api/settings'?{settings:{theme:'dark'}}:path==='/api/chat'?{conversations:[]}:path==='/api/notifications/summary'?{unread:0,unreadMessages:0}:path==='/api/search'?{items:[{uid:'test',handle:'teststudent',name:'Test student'}]}:path==='/api/explore'?{items:[{id:'mock-reel-001',type:'reel',authorHandle:'mockuser',caption:'Reel',mediaType:'video/mp4',mediaCount:1,likes:2,comments:1,thumbUrl:'/cc-mark.svg'}],nextCursor:null}:{items:[]};await route.fulfill({status:path==='/api/chat/token'?403:200,contentType:'application/json',body:JSON.stringify(data)})});
 await page.goto('/explore');const search=page.getByRole('combobox',{name:'Search CampusConnect'});
 await expect(search).toBeVisible();await expect(page.locator('.cc-explore-tile')).toHaveCount(1);await expect(page.locator('.cc-explore-tile video')).toHaveCount(0);await expect(page.locator('.cc-explore-play')).toBeVisible();await expect(page.locator('.cc-suggestions')).toHaveCount(0);
 await expect(page.locator('.cc-sidebar .cc-brand-mark')).toHaveCSS('background-image','none');await expect(page.locator('.cc-sidebar .cc-brand-mark')).toHaveCSS('width','24px');
 await search.fill('test');await expect(page.getByRole('option',{name:/teststudent/i})).toBeVisible();await search.press('ArrowDown');await expect(page.getByRole('option',{name:/teststudent/i})).toHaveAttribute('aria-selected','true');await page.locator('.cc-explore-tile').hover();await page.mouse.click(1100,100);await expect(search).toHaveAttribute('aria-expanded','false');
 await page.setViewportSize({width:390,height:844});await expect(page.locator('.cc-explore-grid')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
for(const [width,height,mode] of [[360,640,'left'],[640,360,'overlay']] as const){
 test('Reel caption '+mode+' follows video aspect ratio',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;const reel={id:'mock-reel-001',authorUid:'mock-shell',authorHandle:'mockuser',authorName:'Mock',avatarUrl:null,caption:'Video',mediaId:'mock-video',mediaUrl:null,likes:0,comments:0,reposts:0,views:0,liked:false,saved:false,reposted:false,isMine:true,followStatus:'none',createdAt:Date.now(),width,height};const data=path==='/api/auth'?{user:{uid:'mock-shell',profile:{handle:'mockuser',avatarMediaId:null}}}:path==='/api/reels'?{reels:[reel],nextCursor:null}:path==='/api/settings'?{settings:{theme:'dark'}}:path==='/api/chat'?{conversations:[]}:path==='/api/notifications/summary'?{unread:0,unreadMessages:0}:{};await route.fulfill({status:path==='/api/chat/token'?403:200,contentType:'application/json',body:JSON.stringify(data)})});
  await page.goto('/reels');const block=page.locator('.cc-reel-caption');await expect(block).toHaveAttribute('data-caption-placement',mode);await expect(page.locator('.cc-reel-video-box .cc-reel-caption')).toHaveCount(mode==='left'?0:1);
  await page.setViewportSize({width:390,height:844});await expect(block).toHaveAttribute('data-caption-placement','overlay');
 });
}
