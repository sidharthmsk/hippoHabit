import { HabitForm } from "@/components/habit-form";
import { createHabit } from "@/lib/actions";
import { listGroups } from "@/lib/queries";

export default function NewHabitPage() {
  const groups = listGroups();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <h1 className="mb-8 text-[32px] font-semibold tracking-tight md:text-[40px]">
        New habit
      </h1>
      <HabitForm action={createHabit} groups={groups} submitLabel="Create" />
    </div>
  );
}
