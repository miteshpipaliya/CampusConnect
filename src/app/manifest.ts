import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest {
 const result:MetadataRoute.Manifest & {display_override:('standalone'|'minimal-ui')[]}={display_override:['standalone','minimal-ui'],id:'/',name:'CampusConnect',short_name:'CampusConnect',description:'CampusConnect - your campus, your people. The BVM student community.',start_url:'/home?source=pwa',scope:'/',display:'standalone',orientation:'portrait',lang:'en-IN',dir:'ltr',categories:['social','education'],prefer_related_applications:false,background_color:'#080a0e',theme_color:'#080a0e',
 icons:[{src:'/pwa-icon/192?v=1',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/pwa-icon/512?v=1',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/pwa-icon/maskable-192?v=1',sizes:'192x192',type:'image/png',purpose:'maskable'},{src:'/pwa-icon/maskable-512?v=1',sizes:'512x512',type:'image/png',purpose:'maskable'}],
 shortcuts:[{name:'Reels',url:'/reels'},{name:'Messages',url:'/messages'},{name:'Notifications',url:'/notifications'},{name:'New post',url:'/home?compose=1'}].map(item=>({...item,icons:[{src:'/pwa-icon/96?v=1',sizes:'96x96',type:'image/png'}]}))};
 return result;
}
