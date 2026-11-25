import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {buildServiceWorker} from '../src/lib/core/sw-script.ts';
test('worker parses, keeps private data out of cache and provides offline fallback',async()=>{
 const source=buildServiceWorker({version:'unit-v1',push:null});assert.doesNotMatch(source,/importScripts|firebase/);assert.match(source,/cc-static-unit-v1/);assert.match(source,/cc-offline-unit-v1/);
 const handlers={},cached=new Response('static'),offline=new Response('offline'),puts=[];let fail=false;
 const scope={location:{origin:'https://campus.test'},addEventListener:(type,fn)=>{handlers[type]=fn}};
 const cache={match:async r=>r.url?.includes('/_next/static/')?cached:undefined,put:async(...args)=>puts.push(args)};
 new vm.Script(source).runInNewContext({self:scope,caches:{open:async()=>cache,match:async()=>offline},URL,Response,AbortController,setTimeout,clearTimeout,fetch:async()=>{if(fail)throw Error('offline');return new Response('network')}});
 const request=(path,opts={})=>{let result;const r={url:new URL(path,scope.location.origin).href,method:'GET',headers:new Headers(),mode:'cors',...opts};handlers.fetch({request:r,respondWith:p=>{result=p}});return result};
 for(const [path,opts] of [['/api/posts',{}],['/api/media?id=1',{}],['https://r2.test/a',{}],['/home',{method:'POST'}],['/video',{headers:new Headers({Range:'bytes=0-'})}],['/home',{headers:new Headers({RSC:'1'})}],['/home?_rsc=1',{}],['/_next/data/x',{}]])assert.equal(request(path,opts),undefined);
 assert.equal(await request('/_next/static/x.js'),cached);fail=true;assert.equal(await request('/home',{mode:'navigate'}),offline);assert.equal(puts.length,0);
});
test('push worker embeds only public config',()=>{const source=buildServiceWorker({version:'push-v1',push:{firebase:{projectId:'demo',apiKey:'public-test',appId:'app',messagingSenderId:'123'}}});new vm.Script(source);assert.match(source,/importScripts/);assert.match(source,/public-test/);assert.doesNotMatch(source,/PRIVATE KEY|privateKey|clientEmail|vapidKey/);assert.match(source,/notificationclick/)});
