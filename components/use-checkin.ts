"use client";

import { useOptimistic, useTransition } from "react";
import { setCheckin } from "@/lib/actions";
import { showToast } from "./toast";

/** Optimistic check-in state for one habit and day. Rolls back and explains on failure. */
export function useCheckin(habitId: string, day: string, done: boolean) {
  const [optimistic, setOptimistic] = useOptimistic(done);
  const [, start] = useTransition();

  function toggle() {
    const next = !optimistic;
    start(async () => {
      setOptimistic(next);
      try {
        const result = await setCheckin(habitId, day, next);
        if (result.error) showToast(result.error);
      } catch {
        showToast("Couldn't save. Check your connection and try again.");
      }
    });
  }

  return [optimistic, toggle] as const;
}
