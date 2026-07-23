import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

for (const packageName of ['shared-types', 'shared-utils']) {
  const packageRoot = new URL(`../packages/${packageName}/`, import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('package.json', packageRoot), 'utf8'));

  assert.equal(
    manifest.main,
    './dist/index.js',
    `${packageName} must expose compiled JavaScript at runtime`,
  );
  assert.equal(
    manifest.types,
    './dist/index.d.ts',
    `${packageName} must expose compiled declarations`,
  );
  await access(new URL(manifest.main, packageRoot));
  await access(new URL(manifest.types, packageRoot));
  require(fileURLToPath(packageRoot));
}

console.log('Workspace package entrypoints verified');
