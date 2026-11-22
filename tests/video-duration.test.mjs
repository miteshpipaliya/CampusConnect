import test from 'node:test';import assert from 'node:assert/strict';
import {parseMp4Duration,durationWithinLimit} from '../src/lib/core/video-duration.ts';
function box(type,payload){const bytes=new Uint8Array(8+payload.length);new DataView(bytes.buffer).setUint32(0,bytes.length);for(let i=0;i<4;i++)bytes[4+i]=type.charCodeAt(i);bytes.set(payload,8);return bytes}
test('MP4 mvhd version 0 duration',()=>{
 const payload=new Uint8Array(20);const view=new DataView(payload.buffer);view.setUint32(12,1000);view.setUint32(16,60000);
 assert.equal(parseMp4Duration(box('moov',box('mvhd',payload))),60);
});
test('unreadable MP4 headers and duration limits fail closed',()=>{
 assert.equal(parseMp4Duration(new Uint8Array([1,2,3])),null);
 assert.equal(durationWithinLimit(null,20,60),false);
 assert.equal(durationWithinLimit(61,61,60),false);
 assert.equal(durationWithinLimit(60,60,60),true);
 assert.equal(durationWithinLimit(60,30,60),false);
});

test('WebM invalid metadata fails closed',async()=>{
 const {parseWebmDuration}=await import('../src/lib/core/video-duration.ts');
 assert.equal(parseWebmDuration(new Uint8Array([0x1a,0x45,0xdf,0xa3])),null);
});

test('WebM reads Info.Duration from a bounded segment',async()=>{
 const {parseWebmDuration}=await import('../src/lib/core/video-duration.ts');
 const float=new Uint8Array(8);new DataView(float.buffer).setFloat64(0,60000,false);
 const duration=new Uint8Array([0x44,0x89,0x88,...float]);
 const info=new Uint8Array([0x15,0x49,0xa9,0x66,0x80+duration.length,...duration]);
 const segment=new Uint8Array([0x18,0x53,0x80,0x67,0x80+info.length,...info]);
 assert.equal(parseWebmDuration(segment),60);
});
