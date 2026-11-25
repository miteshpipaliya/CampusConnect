import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const out=new URL('../public/rewards/hd/',import.meta.url);
await mkdir(out,{recursive:true});
for(const name of ["hoodie","earbuds","tshirt","bottle","alchemist"]){
 const source=new URL('../assets/rewards/'+name+'.png',import.meta.url);
 const image=await sharp(fileURLToPath(source)).rotate().flatten({background:'#ffffff'}).resize(1840,1840,{fit:'inside',kernel:'lanczos3'}).toBuffer();
 const {width,height}=await sharp(image).metadata();
 const left=Math.floor((2048-width)/2),top=Math.floor((2048-height)/2);
 await sharp(image).extend({top,bottom:2048-height-top,left,right:2048-width-left,background:'#ffffff'}).webp({quality:93,effort:5}).toFile(fileURLToPath(new URL(name+'.webp',out)));
}
