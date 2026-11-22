import test from 'node:test';
import assert from 'node:assert/strict';
import {isPrivateAccount,canViewPrivacy} from '../src/lib/core/privacy-rules.ts';
import {userRateKey,ipRateKey} from '../src/lib/core/rate-key.ts';
test('private state supports legacy and new documents',()=>{
 assert.equal(isPrivateAccount({privacy:'private'}),true);
 assert.equal(isPrivateAccount({isPrivate:true}),true);
 assert.equal(isPrivateAccount({settings:{isPrivate:true}}),true);
 assert.equal(isPrivateAccount({privacy:'campus',isPrivate:false,settings:{isPrivate:false}}),false);
});
test('production privacy facts deny blocked and unfollowed private accounts',()=>{
 assert.equal(canViewPrivacy({self:false,blocked:true,privateAccount:false,activeFollower:true}),false);
 assert.equal(canViewPrivacy({self:false,blocked:false,privateAccount:true,activeFollower:false}),false);
});
test('rate keys separate user and shared IP scopes',()=>{
 assert.equal(userRateKey('follow:{uid}','alice'),'follow:alice');
 assert.equal(ipRateKey('follow:{uid}','1.2.3.4'),'ip:1.2.3.4:follow:shared');
 assert.equal(ipRateKey('follow:{uid}','1.2.3.4'),ipRateKey('follow:{uid}','1.2.3.4'));
});
