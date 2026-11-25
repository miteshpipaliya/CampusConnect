import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
for(const [name,hash] of [['entry','1f0bd8cecc32b1d9b25c0c2f74e4c7dd9286c236'],['day','9e2b7bdc103d5521f2f0bc591c01eadca0b3f8b7']])test('supplied campus '+name+' artwork is optimized and unchanged',async()=>{const data=readFileSync('public/campus/'+name+'.webp');assert.equal(createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex'),hash);const m=await sharp(data).metadata();assert.equal(m.format,'webp');assert.equal(m.width,1672);assert.equal(m.height,941);assert.ok(data.length<550000)});

test('clean welcome illustration contains no baked interface and is preserved in Git',async()=>{const data=readFileSync('public/campus/welcome-scene.png');assert.equal(createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex'),'5be51cf7141d293a537769012767c3e39d44868e');const m=await sharp(data).metadata();assert.equal(m.width,1672);assert.equal(m.height,941)});
