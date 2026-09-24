import { moveGroup, moveHabit } from "@/lib/actions";
import { listGroups, listHabits } from "@/lib/queries";
import type { HabitListItem } from "@/lib/types";

export default function ArrangePage() {
  const groups = listGroups();
  const habits = listHabits();
  const ungrouped = habits.filter((habit) => !habit.groupId);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <h1 className="mb-2 text-[32px] font-semibold tracking-tight md:text-[40px]">
        Arrange
      </h1>
      <p className="mb-8 text-sm text-muted">
        Set the order of groups and of the habits inside each group.
      </p>

      {habits.length === 0 && <p className="text-muted">No habits yet.</p>}

      {groups.map((group, index) => (
        <section key={group.id} className="mb-8">
          <div className="mb-1 flex items-center gap-2 border-b border-border pb-1">
            <h2 className="min-w-0 flex-1 truncate text-[15px] font-medium">
              {group.name}
            </h2>
            <MoveButtons
              label={group.name}
              up={index > 0 ? moveGroup.bind(null, group.id, "up") : null}
              down={
                index < groups.length - 1
                  ? moveGroup.bind(null, group.id, "down")
                  : null
              }
            />
          </div>
          <HabitOrder habits={habits.filter((h) => h.groupId === group.id)} />
        </section>
      ))}

      {ungrouped.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-1 border-b border-border pb-1 text-[15px] font-medium">
            Ungrouped
          </h2>
          <HabitOrder habits={ungrouped} />
        </section>
      )}
    </div>
  );
}

function HabitOrder({ habits }: { habits: HabitListItem[] }) {
  if (habits.length === 0) {
    return <p className="py-2 pl-4 text-sm text-muted">No active habits.</p>;
  }
  return (
    <ul>
      {habits.map((habit, index) => (
        <li key={habit.id} className="flex items-center gap-2 py-1 pl-4">
          <span className="min-w-0 flex-1 truncate text-sm">{habit.name}</span>
          <MoveButtons
            label={habit.name}
            up={index > 0 ? moveHabit.bind(null, habit.id, "up") : null}
            down={
              index < habits.length - 1
                ? moveHabit.bind(null, habit.id, "down")
                : null
            }
          />
        </li>
      ))}
    </ul>
  );
}

function MoveButtons({
  label,
  up,
  down,
}: {
  label: string;
  up: (() => Promise<void>) | null;
  down: (() => Promise<void>) | null;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <MoveButton action={up} label={`Move ${label} up`} path="M4 10 8 6l4 4" />
      <MoveButton
        action={down}
        label={`Move ${label} down`}
        path="M4 6l4 4 4-4"
      />
    </div>
  );
}

function MoveButton({
  action,
  label,
  path,
}: {
  action: (() => Promise<void>) | null;
  label: string;
  path: string;
}) {
  return (
    <form action={action ?? undefined}>
      <button
        type="submit"
        disabled={!action}
        aria-label={label}
        className="flex h-9 w-9 items-center justify-center rounded-[4px] text-muted outline-none hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30 disabled:hover:bg-transparent md:h-7 md:w-7"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d={path} />
        </svg>
      </button>
    </form>
  );
}
