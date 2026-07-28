import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;

  // No password configured (e.g. local dev) — don't lock anyone out.
  if (!password) {
    return NextResponse.next();
  }

  const auth = req.headers.get("authorization");
  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const [, suppliedPassword] = Buffer.from(encoded, "base64")
        .toString()
        .split(":");
      if (suppliedPassword === password) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="phone-watchdog"' },
  });
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
