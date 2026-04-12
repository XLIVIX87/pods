import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // Check for auth token
  const token = await getToken({ req: request });

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
    "/((?!api/(?!auth)|_next/static|_next/image|.*\\.png$|.*\\.svg$|manifest\\.json|favicon\\.ico).*)",
  ],
};
