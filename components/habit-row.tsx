import Link from "next/link";
import { CheckCell } from "./check-cell";
import { PriorityMark } from "./priority-mark";
import type { HabitListItem } from "@/lib/types";
import { formatDayHeading } from "@/lib/timezone";

type Props = {
  habit: HabitListItem;
  days: string[];
  today: string;
};

export function DayHeaders({ days, today }: { days: string[]; today: string }) {
  return (
    <div className="flex items-end gap-1 pb-1">
      <div className="min-w-0 flex-1 px-0.5 text-xs text-muted">Date</div>
      <div className="hidden w-9 text-center text-[10px] leading-tight text-muted md:block">
        Streak
      </div>
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
            <span>{weekday}</span>
            <span className="tabular-nums">{date}</span>
          </div>
        );
      })}
    </div>
  );
}

export function HabitRow({ habit, days, today }: Props) {
  const done = new Set(habit.recent);

  return (
    <div className="group flex items-center gap-1 border-b border-border py-1">
      <div className="min-w-0 flex-1 pr-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={`/habits/${habit.id}`}
            className="-mx-1 w-fit max-w-full min-w-0 break-words rounded-[4px] px-1.5 py-1 text-[15px] leading-6 outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-accent"
          >
            {habit.name}
          </Link>
          <span className="hidden shrink-0 sm:inline">
            <PriorityMark priority={habit.priority} />
          </span>
        </div>
      </div>
      <div
        className="hidden w-9 text-center text-xs tabular-nums text-muted md:block"
        title={
          habit.currentStreak > 0
            ? `${habit.currentStreak}-week streak`
            : undefined
        }
      >
        {habit.currentStreak > 0 ? `${habit.currentStreak}w` : ""}
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
            />
          </div>
        );
      })}
    </div>
  );
}
