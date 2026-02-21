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
// Auth Validation
// ============================================

/**
 * Parse the pb_auth cookie and check if the session looks valid.
 * Performs a lightweight JWT expiry check — full validation happens
 * server-side via PocketBase.
 */
function isSessionValid(cookieValue: string): boolean {
  try {
    const data = JSON.parse(decodeURIComponent(cookieValue));
    // Must have a token string and a record with an id
    if (!data.token || typeof data.token !== "string") return false;
    if (!data.record?.id || typeof data.record.id !== "string") return false;

    // Basic JWT structure check (3 dot-separated base64 segments)
    const parts = data.token.split(".");
    if (parts.length !== 3) return false;

    // Check expiry from JWT payload (middle segment)
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// ============================================
// Middleware
// ============================================

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for PocketBase auth cookie
  const pbAuth = request.cookies.get("pb_auth");
  const isAuthenticated = !!pbAuth?.value && isSessionValid(pbAuth.value);

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
