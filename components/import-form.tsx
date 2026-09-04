"use client";

import { useActionState } from "react";
import { importBackupAction } from "@/lib/actions";

export function ImportForm() {
  const [state, action, pending] = useActionState(importBackupAction, undefined);

  return (
    <form
      action={action}
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        if (
          !window.confirm(
            "This replaces all habits and check-ins with the file. Continue?",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input
        name="backup"
        type="file"
        accept="application/json,.json"
        required
        aria-label="Backup file"
        className="text-sm file:mr-3 file:h-10 file:rounded-[4px] file:border file:border-border file:bg-surface file:px-4 file:text-sm file:text-foreground hover:file:bg-hover"
      />
      {state?.error && (
        <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-10 w-fit rounded-[4px] border border-border px-4 text-sm hover:bg-hover disabled:opacity-60"
      >
        Import
      </button>
    </form>
  );
}
