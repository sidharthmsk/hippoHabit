import { notFound } from "next/navigation";
import { HabitList } from "@/components/habit-list";
import { getGroup, listHabits } from "@/lib/queries";

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
