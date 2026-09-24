import { HabitList } from "@/components/habit-list";
import { listHabits } from "@/lib/queries";

export default function ArchivedPage() {
  const habits = listHabits({
    archived: true,
  });
  return (
    <HabitList
      habits={habits}
      title="Archived"
      empty="Nothing archived."
    />
  );
}
