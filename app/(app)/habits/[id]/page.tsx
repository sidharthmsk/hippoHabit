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

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <Link
        href="/"
        className="mb-6 inline-block text-sm text-muted hover:text-foreground"
      >
        hippoHabit
      </Link>
      <div className="mb-2 flex items-start justify-between gap-4">
        <h1 className="text-[32px] font-semibold tracking-tight md:text-[40px]">
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

      <div className="mb-8 flex gap-8 text-sm">
        <div>
          <div className="text-muted">Current</div>
          <div className="text-2xl font-semibold tabular-nums">
            {habit.currentStreak}
          </div>
        </div>
        <div>
          <div className="text-muted">Longest</div>
          <div className="text-2xl font-semibold tabular-nums">
            {habit.longestStreak}
          </div>
        </div>
      </div>

      <Heatmap
        habitId={habit.id}
        habitName={habit.name}
        daysDone={habit.allCheckins}
        today={todayDay}
      />
    </div>
  );
}
