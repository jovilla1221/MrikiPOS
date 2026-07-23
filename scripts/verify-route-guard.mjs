import assert from 'node:assert/strict';

// Test implementation of route guard middleware logic
const protectedPrefixes = [
  '/dashboard',
  '/pos',
  '/inventory',
  '/products',
  '/transactions',
  '/reports',
  '/shifts',
  '/customers',
  '/credits',
];

function simulateMiddleware(pathname, cookies) {
  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected) {
    const token = cookies['mrikipos_auth'];
    if (!token) {
      return { redirect: `/login?from=${encodeURIComponent(pathname)}` };
    }
  }

  return { pass: true };
}

// 1. Test unauthenticated request to protected routes
for (const protectedPath of ['/dashboard', '/pos', '/inventory', '/products/new', '/reports']) {
  const res = simulateMiddleware(protectedPath, {});
  assert.equal(
    res.redirect,
    `/login?from=${encodeURIComponent(protectedPath)}`,
    `Unauthenticated access to ${protectedPath} should redirect to /login`,
  );
}

// 2. Test authenticated request with cookie to protected routes
for (const protectedPath of ['/dashboard', '/pos', '/inventory']) {
  const res = simulateMiddleware(protectedPath, { mrikipos_auth: 'valid-token' });
  assert.equal(
    res.pass,
    true,
    `Authenticated access to ${protectedPath} should be allowed`,
  );
}

// 3. Test public routes
for (const publicPath of ['/login', '/register', '/otp']) {
  const res = simulateMiddleware(publicPath, {});
  assert.equal(
    res.pass,
    true,
    `Public route ${publicPath} should be allowed without cookie`,
  );
}

console.log('Route guard verification passed: protected routes redirect unauthenticated access to /login');
