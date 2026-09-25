"use client";

import { useActionState, useState } from "react";
import { importBackupAction } from "@/lib/actions";

type Detected = "hippohabit" | "beaver" | "unknown" | null;

const CONFIRM: Record<Exclude<Detected, null>, string> = {
  hippohabit: "This replaces all habits and check-ins with the file. Continue?",
  beaver:
    "Habits from Beaver Habits will be added, and check-ins merged into habits with the same name. Nothing is deleted. Continue?",
  unknown: "Import this file?",
};

const NOTE: Record<Exclude<Detected, null>, string> = {
  hippohabit: "hippoHabit backup. Importing replaces everything here.",
  beaver: "Beaver Habits export. Habits will be merged in; nothing is deleted.",
  unknown: "This doesn't look like a hippoHabit or Beaver Habits file.",
};

export function ImportForm() {
  const [state, action, pending] = useActionState(importBackupAction, undefined);
  const [detected, setDetected] = useState<Detected>(null);

  return (
    <form
      action={action}
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        if (!window.confirm(CONFIRM[detected ?? "unknown"])) {
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
        onChange={async (event) => {
          const file = event.target.files?.[0];
          setDetected(file ? detect(await file.text()) : null);
        }}
        className="text-sm file:mr-3 file:h-10 file:rounded-[4px] file:border file:border-border file:bg-surface file:px-4 file:text-sm file:text-foreground hover:file:bg-hover"
      />
      {detected && <p className="text-sm text-muted">{NOTE[detected]}</p>}
      {state?.error && (
        <p className="text-sm text-danger">{state.error}</p>
      )}
      {state?.message && <p className="text-sm text-done">{state.message}</p>}
      <button
        type="submit"
        disabled={pending || detected === "unknown"}
        className="h-10 w-fit rounded-[4px] border border-border px-4 text-sm hover:bg-hover disabled:opacity-60"
      >
        {pending ? "Importing…" : "Import"}
      </button>
    </form>
  );
}

/** Mirrors the server's detection so the confirmation says what will happen. */
function detect(text: string): Detected {
  try {
    const value = JSON.parse(text);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (value.version !== undefined) return "hippohabit";
      if (Array.isArray(value.habits)) return "beaver";
    }
  } catch {
    // Fall through.
  }
  return "unknown";
}
