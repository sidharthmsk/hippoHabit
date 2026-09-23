"use client";

import { HabitRow } from "./habit-row";
import { ReorderGrip, useHabitLane } from "./reorder-lane";
import type { HabitListItem } from "@/lib/types";

type Props = {
  habits: HabitListItem[];
  days: string[];
  today: string;
  shown: "active" | "archived";
};

export function HabitLane({ habits, days, today, shown }: Props) {
  const lane = useHabitLane(
    habits[0]?.groupId ?? null,
    shown,
    habits.map((habit) => habit.id),
  );
  if (habits.length === 0) return null;

  const byId = new Map(habits.map((habit) => [habit.id, habit]));
  return lane.ids.map((id) => {
    const habit = byId.get(id);
    if (!habit) return null;
    return (
      <HabitRow
        key={id}
        habit={habit}
        days={days}
        today={today}
        handle={
          lane.ids.length < 2 ? null : (
            <ReorderGrip label={`Reorder ${habit.name}`} {...lane.grip(id)} />
          )
        }
      />
    );
  });
}
