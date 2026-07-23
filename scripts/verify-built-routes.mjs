import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifestPath = new URL('../apps/web/.next/routes-manifest.json', import.meta.url);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const registeredRoutes = new Set([
  ...manifest.staticRoutes.map(({ page }) => page),
  ...manifest.dynamicRoutes.map(({ page }) => page),
]);

for (const requiredRoute of ['/dashboard', '/login', '/pos']) {
  assert.ok(
    registeredRoutes.has(requiredRoute),
    `Route ${requiredRoute} is missing from the production build`,
  );
}

console.log('Production routes verified: /dashboard, /login, /pos');
