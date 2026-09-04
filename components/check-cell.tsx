"use client";

import { useOptimistic, useTransition } from "react";
import { toggleCheckin } from "@/lib/actions";
import { formatLongDate } from "@/lib/timezone";

type Props = {
  habitId: string;
  habitName: string;
  day: string;
  done: boolean;
  isToday?: boolean;
  compact?: boolean;
};

export function CheckCell({
  habitId,
  habitName,
  day,
  done,
  isToday = false,
  compact = false,
}: Props) {
  const [optimistic, setOptimistic] = useOptimistic(done);
  const [, start] = useTransition();
  const size = compact
    ? "h-10 w-10 md:h-7 md:w-7"
    : "h-8 w-8";

  return (
    <button
      type="button"
      aria-pressed={optimistic}
      aria-label={`${habitName}, ${formatLongDate(day)}`}
      onClick={() => {
        start(async () => {
          setOptimistic(!optimistic);
          await toggleCheckin(habitId, day);
        });
      }}
      className={`${size} inline-flex items-center justify-center rounded-[3px] border transition-colors ${
        optimistic
          ? "border-done bg-done text-white"
          : "border-foreground/25 bg-transparent text-transparent hover:border-foreground/50"
      } ${isToday && !optimistic ? "border-foreground/60" : ""}`}
    >
      <svg
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        aria-hidden="true"
      >
        <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
      </svg>
    </button>
  );
}
