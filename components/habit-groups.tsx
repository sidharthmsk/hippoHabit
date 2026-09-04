"use client";

import { useState } from "react";
import { DayHeaders, HabitRow } from "./habit-row";
import { writeCollapsedGroupsCookie } from "@/lib/collapsed-groups";
import type { HabitListItem } from "@/lib/types";

export type HabitGroupSection = {
  id: string;
  name: string | null;
  items: HabitListItem[];
};

type Props = {
  sections: HabitGroupSection[];
  days: string[];
  today: string;
  collapsedIds: string[];
};

export function HabitGroups({
  sections,
  days,
  today,
  collapsedIds: initialCollapsedIds,
}: Props) {
  const [collapsedIds, setCollapsedIds] = useState(
    () => new Set(initialCollapsedIds),
  );

  function toggle(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeCollapsedGroupsCookie(next);
      return next;
    });
  }

  return (
    <div>
      {sections.map((section) => {
        const collapsed = collapsedIds.has(section.id);
        const label = section.name ?? "Ungrouped";
        return (
          <section
            key={section.id}
            className={collapsed ? "mb-2 last:mb-0" : "mb-8 last:mb-0"}
          >
            <div className="mb-1 flex items-end gap-1">
              <button
                type="button"
                aria-expanded={!collapsed}
                aria-controls={`group-${section.id}`}
                onClick={() => toggle(section.id)}
                className="-ml-1 flex min-h-10 min-w-0 flex-1 items-center gap-1 rounded-[3px] px-1 text-left hover:bg-hover md:min-h-0 md:pb-1"
              >
                <Chevron expanded={!collapsed} />
                <span className="min-w-0 truncate text-[15px] font-medium">
                  {label}
                </span>
                {collapsed && (
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    {section.items.length}
                  </span>
                )}
              </button>
              {!collapsed && <DayHeaders days={days} today={today} flush />}
            </div>
            <div id={`group-${section.id}`} hidden={collapsed}>
              {section.items.map((habit) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  days={days}
                  today={today}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${
        expanded ? "rotate-90" : ""
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M6 3.5 11 8 6 12.5" />
    </svg>
  );
}
