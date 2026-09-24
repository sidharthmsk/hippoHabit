"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions";
import { PRIORITIES, PRIORITY_LABELS, type Priority } from "@/lib/priority";
import type { Group } from "@/lib/types";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  groups: Group[];
  defaultName?: string;
  defaultGroup?: string;
  defaultPriority?: Priority;
  submitLabel: string;
};

const FIELD =
  "h-10 rounded-[4px] border border-border bg-surface px-3 outline-none focus:border-accent";

export function HabitForm({
  action,
  groups,
  defaultName = "",
  defaultGroup = "",
  defaultPriority = "medium",
  submitLabel,
}: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Name</span>
        <input
          name="name"
          required
          maxLength={100}
          autoFocus
          defaultValue={defaultName}
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={state?.error ? "habit-form-error" : undefined}
          className={FIELD}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Group</span>
        <input
          name="group"
          maxLength={60}
          defaultValue={defaultGroup}
          list="group-options"
          placeholder="Optional"
          className={FIELD}
        />
        <datalist id="group-options">
          {groups.map((group) => (
            <option key={group.id} value={group.name} />
          ))}
        </datalist>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Priority</span>
        <select name="priority" defaultValue={defaultPriority} className={FIELD}>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>
      </label>

      {state?.error && (
        <p id="habit-form-error" className="text-sm text-red-700 dark:text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-10 self-start rounded-[4px] bg-foreground px-4 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </form>
  );
}
