import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCaption,validateFileForPurpose,canPublish,MEDIA_RULES} from '../src/lib/core/content-rules.ts';
test('hashtags and mentions: punctuation, positions, case and duplicate elimination',()=>{
 assert.deepEqual(parseCaption('#Start hello (#MIDDLE), end #end! @Alice and @bob, @ALICE'),{hashtags:['start','middle','end'],mentions:['alice','bob']});
});
test('emails and double-at do not count as mentions',()=>assert.deepEqual(parseCaption('a@b.com @@notvalid x@alice.com'),{hashtags:[],mentions:[]}));
test('hashtag and mention caps',()=>{
 const input=Array.from({length:30},(_,i)=>'#tag'+i+' @student'+i).join(' ');
 const parsed=parseCaption(input);assert.equal(parsed.hashtags.length,20);assert.equal(parsed.mentions.length,15);
});
test('file validation uses canonical reserve rules',()=>{
 assert.deepEqual(validateFileForPurpose({type:'video/quicktime',size:1024,durationSec:40},'story'),{ok:true});
 assert.equal(validateFileForPurpose({type:'video/mp4',size:1024,durationSec:61},'story').ok,false);
 assert.equal(validateFileForPurpose({type:'image/jpeg',size:1024},'avatar').ok,true);
 assert.equal(validateFileForPurpose({type:'video/mp4',size:1024},'avatar').ok,false);
});
test('publishing requirements',()=>{
 assert.equal(canPublish({kind:'post',items:[{type:'image/jpeg',status:'done'}]}),true);
 assert.equal(canPublish({kind:'post',items:[]}),false);
 assert.equal(canPublish({kind:'post',items:[{type:'image/jpeg',status:'error'}]}),false);
 assert.equal(canPublish({kind:'story',items:[{type:'image/png'}]}),true);
 assert.equal(canPublish({kind:'reel',items:[{type:'image/jpeg'}]}),false);
 assert.equal(canPublish({kind:'reel',items:[{type:'video/mp4'}]}),true);
 assert.equal(canPublish({kind:'post',items:Array.from({length:11},()=>({type:'image/jpeg'}))}),false);
 assert.equal(MEDIA_RULES.maxCarousel,10);
});

test('mentions at boundaries and punctuation',()=>{
 assert.deepEqual(parseCaption('@first text, @middle; then @last!').mentions,['first','middle','last']);
 assert.deepEqual(parseCaption('a@b.com test@example.com and @person').mentions,['person']);
});
