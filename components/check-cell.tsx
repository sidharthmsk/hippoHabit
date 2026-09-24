"use client";

import { formatLongDate } from "@/lib/timezone";
import { useCheckin } from "./use-checkin";

type Props = {
  habitId: string;
  habitName: string;
  day: string;
  done: boolean;
  isToday?: boolean;
};

export function CheckCell({
  habitId,
  habitName,
  day,
  done,
  isToday = false,
}: Props) {
  const [checked, toggle] = useCheckin(habitId, day, done);
  const tone = checked
    ? "border-done bg-done text-white"
    : isToday
      ? "border-foreground/60 text-transparent hover:border-foreground"
      : "border-foreground/25 text-transparent hover:border-foreground/50";

  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={`${habitName}, ${formatLongDate(day)}`}
      onClick={toggle}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-[3px] border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-background md:h-7 md:w-7 ${tone}`}
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
