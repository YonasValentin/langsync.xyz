import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ============================================
// Route Configuration
// ============================================

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/onboarding"];

// Routes for non-authenticated users only (redirect to dashboard if logged in)
const authRoutes = ["/login", "/sign-up"];

// ============================================
// Middleware
// ============================================

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for PocketBase auth cookie (set by auth-context syncAuthCookie)
  const pbAuth = request.cookies.get("pb_auth");
  const isAuthenticated = !!pbAuth?.value;

  // Check if the current path matches route patterns
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users from protected routes to login
  if (!isAuthenticated && isProtectedRoute) {
    const loginUrl = new URL("/login", request.url);
    // Preserve the intended destination for redirect after login
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// ============================================
// Matcher Configuration
// ============================================

export const config = {
  matcher: [
    // Match all protected and auth routes
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/login",
    "/sign-up",
  ],
};
