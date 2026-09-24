import { notFound } from "next/navigation";
import { HabitList } from "@/components/habit-list";
import { isPriority, PRIORITY_LABELS } from "@/lib/priority";
import { listHabits } from "@/lib/queries";

export default async function PriorityPage({
  params,
}: {
  params: Promise<{ priority: string }>;
}) {
  const { priority } = await params;
  if (!isPriority(priority)) notFound();
  const habits = listHabits({
    priority,
  });
  return (
    <HabitList
      habits={habits}
      title={PRIORITY_LABELS[priority]}
      empty={`No ${PRIORITY_LABELS[priority].toLowerCase()} priority habits.`}
    />
  );
}
