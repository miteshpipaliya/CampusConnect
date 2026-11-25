import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// Firebase Admin 14.5.1 depends on jwks-rsa 4.1.0, which synchronously
// requires ESM-only jose 6. Vercel disables require(ESM) in Functions.
// Load jose inside the existing async key conversion instead. No key,
// signature, validation or algorithm checks are changed.
// Upstream: https://github.com/auth0/node-jwks-rsa/issues/507
const require = createRequire(import.meta.url);
const fromAdmin = createRequire(require.resolve('firebase-admin/auth'));
const dir = dirname(fromAdmin.resolve('jwks-rsa'));
const file = join(dir, 'utils.js');
const version = JSON.parse(readFileSync(join(dir, '..', 'package.json'), 'utf8')).version;
const source = readFileSync(file, 'utf8');
const eager = "const jose = require('jose');";
const entry = 'async function retrieveSigningKeys(jwks) {';
const lazy = entry + "\n  const jose = await import('jose');";
if (source.includes(lazy) && !source.includes(eager)) {
  console.log('Firebase runtime compatibility patch already applied.');
} else if (!source.includes(eager)) {
  // A future upstream fix may remove the eager require. The regression
  // test still verifies the real dependency under the restrictive runtime.
  console.log('No known eager jose require found; verify runtime regression test.');
} else {
  if (version !== '4.1.0' || !source.includes(entry) ||
      source.split(eager).length !== 2 || source.split(entry).length !== 2 ||
      !source.includes('await jose.importJWK(') || !source.includes('await jose.exportSPKI(')) {
    throw new Error('Unexpected jwks-rsa source; review compatibility patch before release.');
  }
  writeFileSync(file, source.replace(eager + '\n', '').replace(entry, lazy), 'utf8');
  console.log('Firebase runtime compatibility patch applied.');
}
