import { notFound } from "next/navigation";
import { HabitList } from "@/components/habit-list";
import { getGroup, listHabits } from "@/lib/queries";
import { addDays, today } from "@/lib/timezone";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const group = getGroup(id);
  if (!group) notFound();
  const habits = listHabits({
    groupId: id,
    sinceDay: addDays(today(), -400),
  });
  return (
    <HabitList
      habits={habits}
      title={group.name}
      empty="No habits in this group."
      grouped={false}
    />
  );
}
