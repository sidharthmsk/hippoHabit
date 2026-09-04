"use client";

import { useActionState } from "react";
import { unlockAction } from "@/lib/actions";

export function UnlockForm() {
  const [state, action, pending] = useActionState(unlockAction, undefined);

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Access key</span>
        <input
          name="key"
          type="password"
          autoFocus
          autoComplete="current-password"
          required
          className="h-11 rounded-[4px] border border-border bg-surface px-3 outline-none focus:border-accent"
        />
      </label>
      {state?.error && (
        <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-[4px] bg-foreground text-sm font-medium text-background hover:opacity-90 disabled:opacity-60"
      >
        Unlock
      </button>
    </form>
  );
}
