"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions";

const inputClass =
  "h-11 rounded-[4px] border border-border bg-surface px-3 outline-none focus:border-accent";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Username</span>
        <input
          name="username"
          type="text"
          autoFocus
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state?.username}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-[4px] bg-foreground text-sm font-medium text-background hover:opacity-90 disabled:opacity-60"
      >
        Sign in
      </button>
    </form>
  );
}
