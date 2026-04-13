import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/api/auth"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow all API routes (they should handle their own auth if needed)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check for auth token
  const isSecure = request.url.startsWith("https://");
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: isSecure,
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string;

  // Landing page — redirect based on role
  if (pathname === "/") {
    if (role === "INVESTOR") {
      return NextResponse.redirect(new URL("/investor", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // INVESTOR can only access /investor
  if (role === "INVESTOR" && !pathname.startsWith("/investor")) {
    return NextResponse.redirect(new URL("/investor", request.url));
  }

  // OPERATOR cannot access /investor
  if (role === "OPERATOR" && pathname.startsWith("/investor")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ADMIN can access everything
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.png$|.*\\.svg$|manifest\\.json|favicon\\.ico).*)",
  ],
};
