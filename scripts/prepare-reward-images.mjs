import sharp from 'sharp';
import {mkdir,rename,rm} from 'node:fs/promises';
import {join} from 'node:path';
const names=['hoodie','earbuds','tshirt','bottle','alchemist'];
const output='public/rewards/hd-v1',size=2048,padding=112;
await mkdir(output,{recursive:true});
for(const name of names){
 const input=join('assets/rewards-original',name+'.png');
 const target=join(output,name+'.webp'),temporary=target+'.tmp-'+process.pid;
 try{
  await sharp(input).rotate().flatten({background:'#ffffff'})
   .resize(size-padding*2,size-padding*2,{fit:'contain',position:'centre',background:'#ffffff',kernel:'lanczos3'})
   .sharpen({sigma:0.6}).extend({top:padding,bottom:padding,left:padding,right:padding,background:'#ffffff'})
   .webp({quality:94,effort:5}).toFile(temporary);
  const metadata=await sharp(temporary).metadata();
  if(metadata.width!==size||metadata.height!==size||metadata.format!=='webp')throw Error('Invalid reward image: '+name);
  await rename(temporary,target);
  console.log('Reward image: '+name+' '+size+'x'+size+' WebP ('+metadata.size+' bytes)');
 }finally{await rm(temporary,{force:true})}
}
