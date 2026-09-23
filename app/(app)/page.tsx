import { HabitList } from "@/components/habit-list";
import { listHabits } from "@/lib/queries";
import { addDays, today } from "@/lib/timezone";

export default function HomePage() {
  const habits = listHabits({ sinceDay: addDays(today(), -400) });
  return (
    <HabitList
      habits={habits}
      title="hippoHabit"
      empty="No habits yet."
    />
  );
}
