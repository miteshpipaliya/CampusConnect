import {test,expect,type BrowserContext} from '@playwright/test';
const base='http://localhost:3000';
type Person={uid:string;handle:string;name:string;avatarMediaId:null;avatarUrl:null};
type Message={id:string;text:string;senderUid:string;createdAt:string;seen:boolean};
test('mocked two-account fallback delivers, updates unread and clears a visible notification',async({browser})=>{
 test.setTimeout(60000);
 const alpha:Person={uid:'mock-alpha',handle:'alpha',name:'Alpha',avatarMediaId:null,avatarUrl:null},beta:Person={uid:'mock-beta',handle:'beta',name:'Beta',avatarMediaId:null,avatarUrl:null};
 const messages:Message[]=[];let unread=false,activityUnread=false,readRequests=0;
 const a=await browser.newContext({baseURL:base}),b=await browser.newContext({baseURL:base});
 async function mock(context:BrowserContext,me:Person,other:Person){
  await context.route('**/api/**',async route=>{
   const req=route.request(),url=new URL(req.url()),path=url.pathname,method=req.method();
   const send=(data:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(path==='/api/auth')return send({user:{uid:me.uid,profile:me}});
   if(path==='/api/chat/token')return send({error:'Stream disabled in mock'},403);
   if(path==='/api/chat/presence')return send({allowed:{[other.uid]:false}});
   if(path==='/api/settings')return send({settings:{theme:'dark'}});
   if(path==='/api/push')return send({enabled:false,registered:false,config:null});
   if(path==='/api/avatar')return send({avatarMediaId:null});
   if(path==='/api/suggestions')return send({members:[]});
   if(path==='/api/notifications/summary')return send({unread:me.uid===beta.uid&&activityUnread?1:0,unreadMessages:me.uid===beta.uid&&unread?1:0});
   if(path==='/api/notifications/read'&&method==='POST'){const body=req.postDataJSON();if(me.uid===beta.uid&&Array.isArray(body.ids)&&body.ids.includes('mock-notification-01')){activityUnread=false;readRequests++}return send({ok:true})}
   if(path==='/api/notifications')return send({items:me.uid===beta.uid&&messages.length?[{id:'mock-notification-01',type:'chat_message',actorUid:alpha.uid,actorHandle:alpha.handle,actorAvatarUrl:null,actors:[{uid:alpha.uid,handle:alpha.handle,avatarUrl:null}],count:1,postId:null,storyId:null,createdAt:messages[0]?.createdAt,unread:activityUnread,targetKind:'post',thumbUrl:null,thumbContentType:'',followStatus:'none'}]:[],nextCursor:null});
   if(path==='/api/chat'){
    if(method==='POST'){const body=req.postDataJSON();if(body.action==='send'&&me.uid===alpha.uid){const id='mock-message-'+(messages.length+1);messages.push({id,text:String(body.text),senderUid:me.uid,createdAt:new Date().toISOString(),seen:false});unread=true;activityUnread=true;return send({ok:true,messageId:id})}if(body.action==='read'&&me.uid===beta.uid){unread=false;messages.forEach(m=>m.seen=true)}return send({ok:true})}
    if(url.searchParams.has('directory'))return send({members:[other]});
    if(url.searchParams.has('with'))return send({messages:[...messages],myUid:me.uid,peerName:other.name,peerUid:other.uid,channelId:'mock-channel',nextCursor:null});
    const last=messages.at(-1);return send({conversations:last?[{...other,peerUid:other.uid,channelId:'mock-channel',preview:last.text,updatedAt:last.createdAt,unreadCount:me.uid===beta.uid&&unread?1:0}]:[]});
   }
   return send({});
  });
 }
 try{
  await mock(a,alpha,beta);await mock(b,beta,alpha);const ap=await a.newPage(),bp=await b.newPage();
  await Promise.all([ap.goto('/messages/beta'),bp.goto('/messages')]);
  const input=ap.getByRole('textbox',{name:'Message',exact:true});await expect(input).toBeVisible();await input.fill('Hello from Alpha');await ap.getByRole('button',{name:'Send message',exact:true}).click();
  await expect(ap.getByRole('log')).toContainText('Hello from Alpha');
  await bp.bringToFront(); const row=bp.getByRole('button',{name:/Alpha.*Hello from Alpha/});await expect(row).toBeVisible({timeout:15000});
  await expect(bp.getByRole('navigation',{name:'Main navigation'}).getByLabel('Unread conversations')).toHaveText('1',{timeout:12000});
  await row.click();await expect(bp.getByRole('log')).toContainText('Hello from Alpha');await expect.poll(()=>unread).toBe(false);await ap.bringToFront(); await expect(ap.getByRole('log')).toContainText('Seen',{timeout:12000});
  await bp.bringToFront(); await bp.goto('/notifications');await expect(bp.getByText(/sent you a message/)).toBeVisible();await expect(bp.getByRole('button',{name:'Mark all as read'})).toHaveCount(0);await expect.poll(()=>readRequests,{timeout:12000}).toBeGreaterThan(0);
 }finally{await a.close();await b.close()}
});