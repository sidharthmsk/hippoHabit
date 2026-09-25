import { NextResponse, type NextRequest } from "next/server";
import { createSession } from "@/lib/auth";
import { readAuthConfig } from "@/lib/auth-config";
import {
  OIDC_CALLBACK_PATH,
  OIDC_FLOW_COOKIE,
  completeOidcLogin,
  publicOrigin,
} from "@/lib/oidc";

export async function GET(request: NextRequest) {
  const { oidc, authSecret, appUrl } = readAuthConfig();
  const origin = publicOrigin(appUrl, request.headers, request.url);
  if (!oidc || !authSecret) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const result = await completeOidcLogin(
    oidc,
    request.nextUrl.search,
    request.cookies.get(OIDC_FLOW_COOKIE)?.value,
    authSecret,
  );

  if (result.ok) {
    await createSession();
  }
  const response = NextResponse.redirect(
    new URL(result.ok ? "/" : `/login?error=oidc-${result.reason}`, origin),
  );
  response.cookies.delete({ name: OIDC_FLOW_COOKIE, path: OIDC_CALLBACK_PATH });
  return response;
}
