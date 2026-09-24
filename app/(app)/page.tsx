import { HabitList } from "@/components/habit-list";
import { listHabits } from "@/lib/queries";

export default function HomePage() {
  return <HabitList habits={listHabits()} empty="No habits yet." />;
}
