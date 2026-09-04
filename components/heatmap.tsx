"use client";

import { useOptimistic, useTransition } from "react";
import { toggleCheckin } from "@/lib/actions";
import { buildHeatmap } from "@/lib/heatmap";
import { formatLongDate } from "@/lib/timezone";

type Props = {
  habitId: string;
  habitName: string;
  daysDone: string[];
  today: string;
};

const WEEKDAYS = ["", "M", "", "W", "", "F", ""];

export function Heatmap({ habitId, habitName, daysDone, today }: Props) {
  const weeks = buildHeatmap(daysDone, today);
  const columns = {
    gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`,
  };

  return (
    <div className="w-full min-w-0">
      <div className="mb-1 grid grid-cols-[1rem_minmax(0,1fr)] gap-2">
        <div />
        <div className="grid gap-px sm:gap-[2px] md:gap-[3px]" style={columns}>
          {weeks.map((week) => (
            <div
              key={week.cells[0]?.date}
              className="overflow-visible whitespace-nowrap text-[9px] leading-3 text-muted"
            >
              {week.monthLabel ?? ""}
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[1rem_minmax(0,1fr)] gap-2">
        <div className="grid h-full grid-rows-7 gap-px text-[9px] leading-none text-muted sm:gap-[2px] md:gap-[3px]">
          {WEEKDAYS.map((label, i) => (
            <span key={i} className="flex items-center">
              {label}
            </span>
          ))}
        </div>
        <div className="grid gap-px sm:gap-[2px] md:gap-[3px]" style={columns}>
          {weeks.map((week) => (
            <div
              key={week.cells[0]?.date}
              className="grid min-w-0 grid-rows-7 gap-px sm:gap-[2px] md:gap-[3px]"
            >
              {week.cells.map((cell) =>
                cell.inRange ? (
                  <HeatCell
                    key={cell.date}
                    habitId={habitId}
                    habitName={habitName}
                    day={cell.date}
                    done={cell.done}
                  />
                ) : (
                  <div
                    key={cell.date}
                    className="aspect-square min-w-0 rounded-[2px]"
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeatCell({
  habitId,
  habitName,
  day,
  done,
}: {
  habitId: string;
  habitName: string;
  day: string;
  done: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(done);
  const [, start] = useTransition();

  return (
    <button
      type="button"
      title={formatLongDate(day)}
      aria-label={`${habitName}, ${formatLongDate(day)}`}
      aria-pressed={optimistic}
      onClick={() => {
        start(async () => {
          setOptimistic(!optimistic);
          await toggleCheckin(habitId, day);
        });
      }}
      className={`aspect-square min-h-0 min-w-0 w-full rounded-[2px] ${
        optimistic ? "bg-done" : "bg-border hover:bg-foreground/20"
      }`}
    />
  );
}
