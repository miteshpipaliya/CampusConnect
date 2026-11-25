import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
await mkdir('public/rewards',{recursive:true});
for(const name of ['hoodie','earbuds','tshirt','bottle','alchemist']){
 const image=await sharp('assets/rewards/'+name+'.png').rotate().flatten({background:'#ffffff'}).resize(1840,1840,{fit:'contain',background:'#ffffff',position:'centre',kernel:'lanczos3'}).extend({top:104,bottom:104,left:104,right:104,background:'#ffffff'}).webp({quality:92,effort:4}).toFile('public/rewards/'+name+'-hd2048.webp');
 if(image.width!==2048||image.height!==2048)throw Error('Invalid reward dimensions: '+name);
 console.log('Reward ready: '+name+' '+image.width+'x'+image.height+' '+image.size+' bytes');
}
