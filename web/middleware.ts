import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Global Edge/Server Middleware for MIMweb.
 * Enforces a strict security perimeter on all public API endpoints (/api/*):
 * 1. Rejects unhandled/hazardous HTTP methods.
 * 2. Injects mandatory OWASP defensive headers (HSTS, nosniff, frame protection, referrer policy).
 * 3. Handles CORS preflight cleanly.
 */
export function middleware(request: NextRequest) {
  // Only guard /api routes
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const method = request.method.toUpperCase();
  const ALLOWED_METHODS = ["GET", "POST", "OPTIONS", "HEAD"];

  if (!ALLOWED_METHODS.includes(method)) {
    return new NextResponse(
      JSON.stringify({ error: `HTTP method ${method} is not supported on this endpoint.` }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Allow": ALLOWED_METHODS.join(", "),
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  }

  // Handle preflight OPTIONS requests cleanly
  if (method === "OPTIONS") {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
      return new NextResponse(null, { status: 403 });
    }
    return new NextResponse(null, {
      status: 204,
      headers: {
        ...(origin ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : {}),
        "Access-Control-Allow-Methods": ALLOWED_METHODS.join(", "),
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Max-Age": "86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const response = NextResponse.next();

  // Inject standard defense-in-depth headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
