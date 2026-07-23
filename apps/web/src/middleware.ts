import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected) {
    const token = request.cookies.get('mrikipos_auth')?.value;
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/pos/:path*',
    '/inventory/:path*',
    '/products/:path*',
    '/transactions/:path*',
    '/reports/:path*',
    '/shifts/:path*',
    '/customers/:path*',
    '/credits/:path*',
  ],
};
