import { cookies } from "next/headers";
import Link from "next/link";
import { HabitGroups, type HabitGroupSection } from "./habit-groups";
import { DayHeaders, HabitRow } from "./habit-row";
import {
  parseCollapsedGroups,
  COLLAPSED_GROUPS_COOKIE,
  UNGROUPED_GROUP_ID,
} from "@/lib/collapsed-groups";
import type { HabitListItem } from "@/lib/types";
import { VISIBLE_DAYS } from "@/lib/queries";
import { recentDays, today as todayStamp } from "@/lib/timezone";

type Props = {
  habits: HabitListItem[];
  /** Omit to show today's progress instead of a heading. */
  title?: string;
  empty: string;
  grouped?: boolean;
};

export async function HabitList({
  habits,
  title,
  empty,
  grouped = true,
}: Props) {
  const today = todayStamp();
  const days = recentDays(VISIBLE_DAYS);
  const collapsedIds = grouped
    ? [
        ...parseCollapsedGroups(
          (await cookies()).get(COLLAPSED_GROUPS_COOKIE)?.value,
        ),
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        {title ? (
          <h1 className="text-[32px] font-semibold tracking-tight md:text-[40px]">
            {title}
          </h1>
        ) : (
          <TodayProgress habits={habits} today={today} />
        )}
        <Link
          href="/habits/new"
          className="text-sm text-muted hover:text-foreground"
        >
          New
        </Link>
      </div>

      {habits.length === 0 ? (
        <p className="text-muted">
          {empty}{" "}
          <Link href="/habits/new" className="text-foreground underline">
            Add a habit
          </Link>
          .
        </p>
      ) : grouped ? (
        <HabitGroups
          sections={groupHabits(habits)}
          days={days}
          today={today}
          collapsedIds={collapsedIds}
        />
      ) : (
        <div>
          <DayHeaders days={days} today={today} />
          <div>
            {habits.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                days={days}
                today={today}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TodayProgress({
  habits,
  today,
}: {
  habits: HabitListItem[];
  today: string;
}) {
  const done = habits.filter((habit) => habit.recent.includes(today)).length;
  const total = habits.length;
  return (
    <div className="min-w-0 flex-1">
      <h1 className="sr-only">Today</h1>
      <p className="text-sm text-muted">
        <span className="font-medium tabular-nums text-foreground">
          {done}/{total}
        </span>{" "}
        done today
      </p>
      <div
        className="mt-2 h-1 max-w-48 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-label="Habits done today"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
      >
        <div
          className="h-full rounded-full bg-done transition-[width]"
          style={{ width: total ? `${(done / total) * 100}%` : "0%" }}
        />
      </div>
    </div>
  );
}

function groupHabits(habits: HabitListItem[]): HabitGroupSection[] {
  const byGroup = new Map<string, HabitListItem[]>();
  const ungrouped: HabitListItem[] = [];
  const order: string[] = [];

  for (const habit of habits) {
    if (!habit.groupId || !habit.groupName) {
      ungrouped.push(habit);
      continue;
    }
    if (!byGroup.has(habit.groupId)) {
      byGroup.set(habit.groupId, []);
      order.push(habit.groupId);
    }
    byGroup.get(habit.groupId)!.push(habit);
  }

  const sections = order.map((id) => ({
    id,
    name: byGroup.get(id)![0].groupName,
    items: byGroup.get(id)!,
  }));
  if (ungrouped.length > 0) {
    sections.push({
      id: UNGROUPED_GROUP_ID,
      name: null,
      items: ungrouped,
    });
  }
  return sections;
}
