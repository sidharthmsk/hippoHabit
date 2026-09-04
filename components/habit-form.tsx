import type { Group } from "@/lib/types";
import { PRIORITIES, PRIORITY_LABELS, type Priority } from "@/lib/priority";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  groups: Group[];
  defaultName?: string;
  defaultGroup?: string;
  defaultPriority?: Priority;
  submitLabel: string;
};

export function HabitForm({
  action,
  groups,
  defaultName = "",
  defaultGroup = "",
  defaultPriority = "medium",
  submitLabel,
}: Props) {
  return (
    <form action={action} className="flex max-w-md flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Name</span>
        <input
          name="name"
          required
          autoFocus
          defaultValue={defaultName}
          className="h-10 rounded-[4px] border border-border bg-surface px-3 outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Group</span>
        <input
          name="group"
          defaultValue={defaultGroup}
          list="group-options"
          placeholder="Optional"
          className="h-10 rounded-[4px] border border-border bg-surface px-3 outline-none focus:border-accent"
        />
        <datalist id="group-options">
          {groups.map((group) => (
            <option key={group.id} value={group.name} />
          ))}
        </datalist>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Priority</span>
        <select
          name="priority"
          defaultValue={defaultPriority}
          className="h-10 rounded-[4px] border border-border bg-surface px-3 outline-none focus:border-accent"
        >
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="h-10 self-start rounded-[4px] bg-foreground px-4 text-sm font-medium text-background hover:opacity-90"
      >
        {submitLabel}
      </button>
    </form>
  );
}
