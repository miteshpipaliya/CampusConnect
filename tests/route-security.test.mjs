import test from 'node:test';import assert from 'node:assert/strict';import {readdirSync,readFileSync} from 'node:fs';import {join,relative} from 'node:path';
const root=join(process.cwd(),'src/app/api');
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(join(dir,entry.name)):entry.name==='route.ts'?[join(dir,entry.name)]:[])}
// Auth owns credential verification, restore verifies a deleted user's signed cookie,
// cron has a secret, and health exposes only redacted public status.
const special=new Set(['auth/route.ts','account/restore/route.ts','cron/cleanup/route.ts','integrations/health/route.ts']);
test('API route sources retain auth and origin-check markers',()=>{const files=walk(root);assert.ok(files.length>=63);for(const file of files){const path=relative(root,file).replaceAll('\\','/'),source=readFileSync(file,'utf8');if(!special.has(path))assert.match(source,/\b(?:guard|session)\s*\(/,path);if(/export\s+(?:async\s+)?function\s+(?:POST|PATCH|PUT|DELETE)\b/.test(source))assert.match(source,/write\s*:\s*true|sameOrigin\s*\(/,path);assert.doesNotMatch(source,/JSON\.stringify\(error\b|error\.stack\b/,path)}});
