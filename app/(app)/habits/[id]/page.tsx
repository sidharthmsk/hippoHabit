import Link from "next/link";
import { notFound } from "next/navigation";
import { Heatmap } from "@/components/heatmap";
import { PriorityMark } from "@/components/priority-mark";
import { getHabit } from "@/lib/queries";
import { today } from "@/lib/timezone";

export default async function HabitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const habit = getHabit(id);
  if (!habit) notFound();
  const todayDay = today();

  const stats = [
    { label: "Current streak", value: weeks(habit.currentStreak) },
    { label: "Longest streak", value: weeks(habit.longestStreak) },
    { label: "Last 30 days", value: percent(habit.rate30) },
    { label: "All time", value: percent(habit.rateAll) },
    { label: "Check-ins", value: String(habit.total) },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <Link
        href="/"
        className="mb-6 inline-block text-sm text-muted hover:text-foreground"
      >
        hippoHabit
      </Link>
      <div className="mb-2 flex items-start justify-between gap-4">
        <h1 className="min-w-0 break-words text-[32px] font-semibold tracking-tight md:text-[40px]">
          {habit.name}
        </h1>
        <Link
          href={`/habits/${habit.id}/edit`}
          className="mt-2 text-sm text-muted hover:text-foreground"
        >
          Edit
        </Link>
      </div>
      <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        {habit.groupName && (
          <Link href={`/g/${habit.groupId}`} className="hover:text-foreground">
            {habit.groupName}
          </Link>
        )}
        <PriorityMark priority={habit.priority} />
        {habit.archived && <span>Archived</span>}
      </div>

      <dl className="mb-8 grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-muted">{stat.label}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <Heatmap
        habitId={habit.id}
        habitName={habit.name}
        daysDone={habit.allCheckins}
        today={todayDay}
      />
      <p className="mt-6 text-xs text-muted">
        Streaks count weeks with at least one check-in. A streak only breaks
        after a full week (Monday to Sunday) with none.
      </p>
    </div>
  );
}

function weeks(count: number) {
  return `${count} ${count === 1 ? "wk" : "wks"}`;
}

function percent(rate: number) {
  return `${Math.round(rate * 100)}%`;
}
