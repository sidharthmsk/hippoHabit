import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCell } from "./check-cell";
import { PriorityMark } from "./priority-mark";
import type { HabitListItem } from "@/lib/types";
import { formatDayHeading } from "@/lib/timezone";

type Props = {
  habit: HabitListItem;
  days: string[];
  today: string;
  handle?: ReactNode;
};

export function DayHeaders({
  days,
  today,
  flush = false,
}: {
  days: string[];
  today: string;
  flush?: boolean;
}) {
  return (
    <div className={`flex items-end justify-end gap-1 ${flush ? "" : "pb-2"}`}>
      {!flush && <div className="min-w-0 flex-1" />}
      <div className="hidden w-8 md:block" />
      {days.map((day, i) => {
        const { weekday, date } = formatDayHeading(day);
        const hideOnMobile = i < days.length - 5;
        return (
          <div
            key={day}
            className={`flex w-10 flex-col items-center text-[10px] leading-tight text-muted md:w-7 ${
              hideOnMobile ? "hidden md:flex" : "flex"
            } ${day === today ? "text-foreground" : ""}`}
          >
            <span>{weekday.slice(0, 2)}</span>
            <span className="tabular-nums">{date}</span>
          </div>
        );
      })}
    </div>
  );
}

export function HabitRow({ habit, days, today, handle }: Props) {
  const done = new Set(habit.checkins);

  return (
    <div className="group flex items-center gap-1 border-b border-border py-1.5">
      {handle}
      <div className="min-w-0 flex-1 pr-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <Link
            href={`/habits/${habit.id}`}
            className="truncate rounded-[3px] px-0.5 text-[15px] leading-6 hover:bg-hover"
          >
            {habit.name}
          </Link>
          <span className="hidden shrink-0 sm:inline">
            <PriorityMark priority={habit.priority} />
          </span>
        </div>
      </div>
      <div className="hidden w-8 text-right text-xs tabular-nums text-muted md:block">
        {habit.currentStreak > 0 ? habit.currentStreak : ""}
      </div>
      {days.map((day, i) => {
        const hideOnMobile = i < days.length - 5;
        return (
          <div
            key={day}
            className={hideOnMobile ? "hidden md:block" : "block"}
          >
            <CheckCell
              habitId={habit.id}
              habitName={habit.name}
              day={day}
              done={done.has(day)}
              isToday={day === today}
              compact
            />
          </div>
        );
      })}
    </div>
  );
}
