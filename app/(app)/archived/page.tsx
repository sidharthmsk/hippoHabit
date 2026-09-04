import { HabitList } from "@/components/habit-list";
import { listHabits } from "@/lib/queries";
import { addDays, today } from "@/lib/timezone";

export default function ArchivedPage() {
  const habits = listHabits({
    archived: true,
    sinceDay: addDays(today(), -400),
  });
  return (
    <HabitList
      habits={habits}
      title="Archived"
      empty="Nothing archived."
    />
  );
}
