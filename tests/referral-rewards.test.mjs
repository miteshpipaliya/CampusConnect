import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {REFERRAL_REWARDS} from '../src/lib/core/referral-rewards.ts';
function gitHash(data){return createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex')}
test('five prizes in exact rank order; fifth-place asset remains unchanged',()=>{assert.deepEqual(REFERRAL_REWARDS.map(r=>[r.rank,r.title]),[[1,'Black hoodie'],[2,'Wireless earbuds'],[3,'Plain black T-shirt'],[4,'Steel water bottle'],[5,'The Alchemist']]);assert.equal(REFERRAL_REWARDS[4].image,'/rewards/alchemist.webp');assert.equal(gitHash(readFileSync('public'+REFERRAL_REWARDS[4].image)),'cbdf41701c94ba8d01c167e8fbd91a537d8f6ea3');assert.equal(gitHash(readFileSync('assets/rewards/hoodie-original.png')),'8f7023699cd0a18730942bf75ab9bfda4e44e31a')});
const expected=[['hoodie','9f18c90eeaa82620be0076215ee6637d9adf9615'],['earbuds','1c23fc4108b7fe066e01534d85a27f47893b4ec6'],['tshirt','146dc51c40eb79f0d570285c7c3c2a6b3638fcd8'],['bottle','28c1b07952b8f48d0772ce070e3a6ea10a52c316']];
for(const [i,[name,hash]] of expected.entries())test(name+' uses verified centered 2048x2048 WebP',async()=>{const r=REFERRAL_REWARDS[i];assert.equal(r.image,'/rewards/'+name+'-2k.webp');const data=readFileSync('public'+r.image);assert.equal(gitHash(data),hash);const m=await sharp(data).metadata();assert.equal(m.format,'webp');assert.equal(m.width,2048);assert.equal(m.height,2048);const {data:pixels,info}=await sharp(data).removeAlpha().raw().toBuffer({resolveWithObject:true});for(const [x,y] of [[0,0],[2047,0],[0,2047],[2047,2047],[1024,40],[40,1024],[2007,1024],[1024,2007]]){const index=(y*info.width+x)*info.channels;assert.ok(pixels.subarray(index,index+3).every(v=>v>=248),'white margin at '+x+','+y)}});
