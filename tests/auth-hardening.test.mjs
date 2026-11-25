import test from 'node:test';import assert from 'node:assert/strict';
import {AUTH_LIMITS,authRateKey,normalizeEmail,failClosedAfter} from '../src/lib/core/auth-limits.ts';
import {isRevoked} from '../src/lib/core/session-denylist.ts';
import {isReservedHandle} from '../src/lib/core/phase2-rules.ts';
import {ownProfileView} from '../src/lib/core/own-profile.ts';
test('auth quotas are explicit and scoped to digests',()=>{assert.equal(AUTH_LIMITS.loginPassword.email.limit,5);assert.equal(AUTH_LIMITS.requestOtp.ip.windowSec,3600);assert.equal(normalizeEmail(' TEST@EXAMPLE.COM '),'test@example.com');assert.equal(authRateKey('loginPassword','ip','abc'),'auth:loginPassword:ip:abc');assert.equal(failClosedAfter(3),true)});
test('revocations deny active and malformed records',()=>{assert.equal(isRevoked(false,undefined,100),false);assert.equal(isRevoked(true,101,100),true);assert.equal(isRevoked(true,99,100),false);assert.equal(isRevoked(true,null,100),true)});
test('reserved handles reject disguised names',()=>{for(const value of ['adm1n','camp.usconnect','0fficial','b_v_m','root','security'])assert.equal(isReservedHandle(value),true,value);assert.equal(isReservedHandle('student.123'),false)});
test('own profile strips unknown and nested sensitive fields',()=>{assert.deepEqual(ownProfileView({handle:'student',email:'private',pushToken:'private',deletedAt:1,counters:{posts:2,internal:99},settings:{theme:'dark',secret:'private'}}),{handle:'student',counters:{posts:2},settings:{theme:'dark'}})});
