import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
const names=['hoodie','earbuds','tshirt','bottle','alchemist'];
await mkdir('public/rewards',{recursive:true});
for(const name of names){
 const source='assets/rewards/'+name+'.png';
 for(const size of [768,3840]){
 const inset=Math.round(size*.06),inner=size-2*inset;
 const product=await sharp(source).flatten({background:'#ffffff'}).resize(inner,inner,{fit:'contain',background:'#ffffff',kernel:'lanczos3'}).sharpen({sigma:0.6}).toBuffer();
 await sharp(product).extend({top:inset,bottom:inset,left:inset,right:inset,background:'#ffffff'}).webp({quality:90,effort:4}).toFile('public/rewards/'+name+(size===3840?'-4k':'-hd')+'.webp');
 }
}
