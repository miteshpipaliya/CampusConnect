import test from 'node:test';import assert from 'node:assert/strict';import {isAllowedEmail} from '../src/lib/student-email.ts';
test('campus emails allowed and arbitrary gmail rejected',()=>{
 assert.equal(isAllowedEmail('26el309@bvmengineering.ac.in'),true);
 assert.equal(isAllowedEmail('random@gmail.com'),false);
 assert.equal(isAllowedEmail('TAUSHALQUERY@GMAIL.COM'),false);
 assert.equal(isAllowedEmail('tester@example.com','tester@example.com'),true);
});
