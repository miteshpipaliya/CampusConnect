import test from 'node:test';import assert from 'node:assert/strict';import {readdirSync,readFileSync} from 'node:fs';import {join,relative} from 'node:path';
const root=join(process.cwd(),'src/app/api');
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(join(dir,entry.name)):entry.name==='route.ts'?[join(dir,entry.name)]:[])}
// Auth owns credential verification, restore verifies a deleted user's signed cookie,
// cron has a secret, and health exposes only redacted public status.
// Introduction is deliberately pre-authentication; its signed, expiring proof is checked separately below.
const special=new Set(['auth/route.ts','account/restore/route.ts','cron/cleanup/route.ts','integrations/health/route.ts','introduction/route.ts']);
test('API route sources retain auth and origin-check markers',()=>{const files=walk(root);assert.ok(files.length>=63);for(const file of files){const path=relative(root,file).replaceAll('\\','/'),source=readFileSync(file,'utf8');if(!special.has(path))assert.match(source,/\b(?:guard|session)\s*\(/,path);if(/export\s+(?:async\s+)?function\s+(?:POST|PATCH|PUT|DELETE)\b/.test(source))assert.match(source,/write\s*:\s*true|sameOrigin\s*\(/,path);assert.doesNotMatch(source,/JSON\.stringify\(error\b|error\.stack\b/,path)}});

test('public introduction uses signed elapsed-time proof, origin and rate limits without a session bypass',()=>{
 const source=readFileSync(join(root,'introduction/route.ts'),'utf8');
 assert.match(source,/sameOrigin\(req\)/);
 assert.match(source,/checkRateLimit\(/);
 assert.match(source,/failClosed:\s*true/);
 assert.match(source,/newIntroProof\(key\)/);
 assert.match(source,/finishIntroProof\(cookie,key\)/);
 assert.match(source,/if\(!completed\)return errorResponse\(409/);
 assert.match(source,/httpOnly:true/);
 assert.match(source,/introCompleted\(cookie\)/);
 assert.doesNotMatch(source,/\bsession\s*\(/);
 const auth=readFileSync(join(root,'auth/route.ts'),'utf8');
 for(const action of ['loginPassword','finishOtp']){
  const start=auth.indexOf("if(action==='"+action+"')");
  assert.ok(start>=0,action);
  assert.match(auth.slice(start,start+300),/if\(!introCompleted\(request.cookies.get\(INTRO_COOKIE\)\?\.value\)\)return errorResponse\(403/,action);
 }
});
