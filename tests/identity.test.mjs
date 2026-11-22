import test from 'node:test';
import assert from 'node:assert/strict';
import {isAllowedEmail,validateHandle,validateBio,nameTokens} from '../src/lib/core/identity.ts';

test('profile email policy includes institutional and explicitly allowlisted testers',()=>{
 assert.equal(isAllowedEmail('24cp12345@bvmengineering.ac.in'),true);
 assert.equal(isAllowedEmail('someone@gmail.com'),false);
 assert.equal(isAllowedEmail('someone@gmail.com',['someone@gmail.com']),true);
});
test('username and bio validation rejects malformed profile fields',()=>{
 assert.equal(validateHandle('Student_24'),true);
 assert.equal(validateHandle('x'),false);
 assert.equal(validateHandle('a..b'),false);
 assert.equal(validateBio('a'.repeat(150)),true);
 assert.equal(validateBio('a'.repeat(151)),false);
});
test('name tokens are normalized and deduplicated',()=>assert.deepEqual(nameTokens('Mitesh Mitesh Pipaliya'),['mitesh','pipaliya']));
