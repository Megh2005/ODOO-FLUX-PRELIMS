import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass static assets and internal next endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Allow next-auth and OTP authentication endpoints
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Check for active NextAuth session cookies
  const session =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname.startsWith("/reset-password");
  const isPublicPage = pathname === "/" || isAuthPage;

  if (session) {
    return NextResponse.next();
  } else {
    if (!isPublicPage) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/inventory/:path*",
    "/customers/:path*",
    "/invoices/:path*",
    "/terms/:path*",
    "/setup-company/:path*",
    "/portal/:path*",
    "/login",
    "/reset-password/:path*",
  ],
};
