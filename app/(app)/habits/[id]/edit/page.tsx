import { notFound } from "next/navigation";
import { ConfirmForm } from "@/components/confirm-form";
import { HabitForm } from "@/components/habit-form";
import {
  archiveHabit,
  deleteHabit,
  unarchiveHabit,
  updateHabit,
} from "@/lib/actions";
import { getHabit, listGroups } from "@/lib/queries";

export default async function EditHabitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const habit = getHabit(id);
  if (!habit) notFound();
  const groups = listGroups();
  const save = updateHabit.bind(null, habit.id);
  const archive = archiveHabit.bind(null, habit.id);
  const unarchive = unarchiveHabit.bind(null, habit.id);
  const remove = deleteHabit.bind(null, habit.id);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <h1 className="mb-8 text-[32px] font-semibold tracking-tight md:text-[40px]">
        Edit habit
      </h1>
      <HabitForm
        action={save}
        groups={groups}
        defaultName={habit.name}
        defaultGroup={habit.groupName ?? ""}
        defaultPriority={habit.priority}
        submitLabel="Save"
      />
      <div className="mt-12 flex gap-4 border-t border-border pt-6 text-sm">
        {habit.archived ? (
          <form action={unarchive}>
            <button type="submit" className="text-muted hover:text-foreground">
              Unarchive
            </button>
          </form>
        ) : (
          <form action={archive}>
            <button type="submit" className="text-muted hover:text-foreground">
              Archive
            </button>
          </form>
        )}
        <ConfirmForm
          action={remove}
          message="Delete this habit and its history?"
        >
          <button
            type="submit"
            className="text-red-700 hover:underline dark:text-red-400"
          >
            Delete
          </button>
        </ConfirmForm>
      </div>
    </div>
  );
}
