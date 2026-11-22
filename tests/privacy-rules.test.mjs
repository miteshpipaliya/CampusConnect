import test from 'node:test';import assert from 'node:assert/strict';import {canViewPrivacy,followAction} from '../src/lib/core/privacy-rules.ts';
test('privacy truth table covers every boolean combination',()=>{
 for(const self of [false,true])for(const blocked of [false,true])for(const privateAccount of [false,true])for(const activeFollower of [false,true]){
 const expected=self||(!blocked&&(!privateAccount||activeFollower));
 assert.equal(canViewPrivacy({self,blocked,privateAccount,activeFollower}),expected);
 }
});
test('follow actions respect privacy and block',()=>{
 assert.equal(followAction({self:false,blocked:false,privateAccount:true,existing:'none'}),'pending');
 assert.equal(followAction({self:false,blocked:false,privateAccount:false,existing:'none'}),'active');
 assert.equal(followAction({self:false,blocked:true,privateAccount:false,existing:'none'}),'forbidden');
});
