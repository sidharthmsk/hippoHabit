import { NextResponse, type NextRequest } from "next/server";
import { readAuthConfig } from "@/lib/auth-config";
import {
  OIDC_CALLBACK_PATH,
  OIDC_FLOW_COOKIE,
  OIDC_FLOW_MAX_AGE,
  beginOidcLogin,
  publicOrigin,
} from "@/lib/oidc";

export async function GET(request: NextRequest) {
  const { oidc, authSecret, appUrl } = readAuthConfig();
  const origin = publicOrigin(appUrl, request.headers, request.url);
  if (!oidc || !authSecret) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  let result;
  try {
    result = await beginOidcLogin(oidc, origin, authSecret);
  } catch (error) {
    console.error("OIDC discovery failed:", error);
    return NextResponse.redirect(new URL("/login?error=oidc-unavailable", origin));
  }

  const response = NextResponse.redirect(result.authorizationUrl);
  response.cookies.set(OIDC_FLOW_COOKIE, result.flowCookie, {
    httpOnly: true,
    // The provider redirects back with a top-level GET, which lax allows.
    sameSite: "lax",
    path: OIDC_CALLBACK_PATH,
    maxAge: OIDC_FLOW_MAX_AGE,
    secure: origin.startsWith("https:"),
  });
  return response;
}
