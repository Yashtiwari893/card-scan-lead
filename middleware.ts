import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  // Check if session token exists
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isAuth = !!token;

  // Protect /dashboard and its sub-routes
  const isAccessingDashboard = req.nextUrl.pathname.startsWith('/dashboard');
  
  if (isAccessingDashboard && !isAuth) {
    // Redirect unauthenticated users to home
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'], // Run middleware on dashboard routes
};
