"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildHeatmap } from "@/lib/heatmap";
import { formatLongDate } from "@/lib/timezone";
import { useCheckin } from "./use-checkin";

type Props = {
  habitId: string;
  habitName: string;
  daysDone: string[];
  today: string;
};

const WEEKDAYS = ["M", "", "W", "", "F", "", ""];
const GAP = "gap-[2px] md:gap-[3px]";

export function Heatmap({ habitId, habitName, daysDone, today }: Props) {
  const weeks = useMemo(() => buildHeatmap(daysDone, today), [daysDone, today]);
  const [active, setActive] = useState<{ day: string; done: boolean } | null>(
    null,
  );
  const scroller = useRef<HTMLDivElement>(null);

  // On narrow screens the grid scrolls sideways; start at the current week.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const columns = {
    gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`,
  };

  return (
    <div className="w-full min-w-0">
      <div className="grid grid-cols-[1rem_minmax(0,1fr)] gap-2">
        <div className={`grid grid-rows-7 pt-4 text-[9px] leading-none text-muted ${GAP}`}>
          {WEEKDAYS.map((label, i) => (
            <span key={i} className="flex items-center">
              {label}
            </span>
          ))}
        </div>
        <div ref={scroller} className="overflow-x-auto pb-1">
          <div className="min-w-[640px]">
            <div className={`mb-1 grid h-3 ${GAP}`} style={columns}>
              {weeks.map((week) => (
                <div
                  key={week.cells[0].date}
                  className="overflow-visible whitespace-nowrap text-[9px] leading-3 text-muted"
                >
                  {week.monthLabel ?? ""}
                </div>
              ))}
            </div>
            <div className={`grid ${GAP}`} style={columns}>
              {weeks.map((week) => (
                <div
                  key={week.cells[0].date}
                  className={`grid min-w-0 grid-rows-7 ${GAP}`}
                >
                  {week.cells.map((cell) =>
                    cell.inRange ? (
                      <HeatCell
                        key={cell.date}
                        habitId={habitId}
                        habitName={habitName}
                        day={cell.date}
                        done={cell.done}
                        onActive={setActive}
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
      </div>
      <p className="mt-2 h-5 text-xs text-muted" aria-live="polite">
        {active
          ? `${formatLongDate(active.day, true)} · ${active.done ? "Done" : "Not done"}`
          : "Tap a day to check it off."}
      </p>
    </div>
  );
}

function HeatCell({
  habitId,
  habitName,
  day,
  done,
  onActive,
}: {
  habitId: string;
  habitName: string;
  day: string;
  done: boolean;
  onActive: (value: { day: string; done: boolean }) => void;
}) {
  const [checked, toggle] = useCheckin(habitId, day, done);

  return (
    <button
      type="button"
      title={formatLongDate(day, true)}
      aria-label={`${habitName}, ${formatLongDate(day, true)}`}
      aria-pressed={checked}
      onMouseEnter={() => onActive({ day, done: checked })}
      onFocus={() => onActive({ day, done: checked })}
      onClick={() => {
        toggle();
        onActive({ day, done: !checked });
      }}
      className={`aspect-square min-h-0 w-full min-w-0 rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        checked ? "bg-done" : "bg-border hover:bg-foreground/20"
      }`}
    />
  );
}
