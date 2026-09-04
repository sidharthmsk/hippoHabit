import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "./lib/crypto";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const unlocked = token
    ? await verifySession(token, process.env.AUTH_SECRET ?? "")
    : false;

  if (pathname === "/unlock") {
    if (unlocked) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!unlocked) {
    const url = request.nextUrl.clone();
    url.pathname = "/unlock";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|.*\\.png$|.*\\.svg$|.*\\.ico$).*)",
  ],
};
