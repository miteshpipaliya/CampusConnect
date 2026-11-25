import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('Firebase Admin and JWKS key conversion work without require(ESM)', () => {
  const code = `
    const assert = require('node:assert/strict');
    const {createRequire} = require('node:module');
    const {dirname, join} = require('node:path');
    const {generateKeyPairSync, sign, verify} = require('node:crypto');
    assert.equal(process.features.require_module, false);
    assert.equal(typeof require('firebase-admin/auth').getAuth, 'function');
    assert.equal(typeof require('firebase-admin/firestore').getFirestore, 'function');
    assert.equal(typeof require('firebase-admin/messaging').getMessaging, 'function');
    const fromAdmin = createRequire(require.resolve('firebase-admin/auth'));
    const {retrieveSigningKeys} = require(join(dirname(fromAdmin.resolve('jwks-rsa')), 'utils.js'));
    (async () => {
      const {publicKey, privateKey} = generateKeyPairSync('rsa', {modulusLength:2048});
      const jwk = {...publicKey.export({format:'jwk'}), kid:'regression', alg:'RS256', use:'sig'};
      const keys = await retrieveSigningKeys([jwk, {...jwk, use:'enc'}]);
      assert.equal(keys.length, 1);
      assert.equal(keys[0].kid, 'regression');
      const data = Buffer.from('runtime regression');
      const signature = sign('sha256', data, privateKey);
      assert.equal(verify('sha256', data, keys[0].getPublicKey(), signature), true);
      assert.equal(verify('sha256', Buffer.from('modified'), keys[0].getPublicKey(), signature), false);
    })().catch(error => {console.error(error); process.exitCode = 1});
  `;
  assert.doesNotThrow(() => execFileSync(process.execPath, ['--no-experimental-require-module', '-e', code], {stdio:'pipe', timeout:15000}));
});
