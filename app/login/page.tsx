import Image from "next/image";
import { connection } from "next/server";
import { LoginForm } from "@/components/login-form";
import { readAuthConfig } from "@/lib/auth-config";

export const dynamic = "force-dynamic";

const OIDC_ERRORS: Record<string, string> = {
  "oidc-unavailable": "Couldn't reach the sign-in provider. Try again shortly.",
  "oidc-expired": "The sign-in took too long or was started elsewhere. Try again.",
  "oidc-denied": "That account isn't allowed to use this app.",
  "oidc-failed": "Sign-in with the provider failed. Try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const { error } = await searchParams;
  const { authSecret, password, oidc, problems } = readAuthConfig();
  const ready = Boolean(authSecret) && Boolean(password || oidc);

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Image
          src="/logo.png"
          alt=""
          width={48}
          height={48}
          className="mb-4 rounded-[12px]"
        />
        <h1 className="mb-1 text-[32px] font-semibold tracking-tight">hippoHabit</h1>
        <p className="mb-8 text-sm text-muted">Sign in to continue.</p>
        {problems.length > 0 && (
          <ul className="mb-6 space-y-1 text-sm text-danger">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        )}
        {error && OIDC_ERRORS[error] && (
          <p className="mb-4 text-sm text-danger">{OIDC_ERRORS[error]}</p>
        )}
        {ready && password && <LoginForm />}
        {ready && password && oidc && (
          <div className="my-6 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
        )}
        {ready && oidc && (
          <a
            href="/auth/oidc/start"
            className={`flex h-11 w-full items-center justify-center rounded-[4px] text-sm font-medium ${
              password
                ? "border border-border hover:bg-hover"
                : "bg-foreground text-background hover:opacity-90"
            }`}
          >
            Sign in with {oidc.name}
          </a>
        )}
      </div>
    </div>
  );
}
