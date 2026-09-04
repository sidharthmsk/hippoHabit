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
import { recentDays, today as todayStamp } from "@/lib/timezone";

type Props = {
  habits: HabitListItem[];
  title: string;
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
  const days = recentDays(7);
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
        <h1 className="text-[32px] font-semibold tracking-tight md:text-[40px]">
          {title}
        </h1>
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
