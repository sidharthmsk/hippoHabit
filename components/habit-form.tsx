"use client";

import { useEffect, useRef, useState } from "react";
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
        <GroupField groups={groups} defaultGroup={defaultGroup} />
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
        <p id="habit-form-error" className="text-sm text-danger">
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

function GroupField({
  groups,
  defaultGroup,
}: {
  groups: Group[];
  defaultGroup: string;
}) {
  const [value, setValue] = useState(defaultGroup);
  const [open, setOpen] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  const query = value.trim().toLowerCase();
  const options = browsing
    ? groups
    : groups.filter((group) => group.name.toLowerCase().includes(query));
  const highlighted = options[Math.min(active, Math.max(options.length - 1, 0))];
  const visible = open && options.length > 0;

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function choose(name: string) {
    setValue(name);
    setBrowsing(false);
    setOpen(false);
  }

  function showAll() {
    setBrowsing(true);
    setActive(0);
    setOpen(groups.length > 0);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      if (event.key === "Enter" && open && highlighted) {
        event.preventDefault();
        choose(highlighted.name);
      }
      return;
    }
    event.preventDefault();
    if (!open || options.length === 0) {
      showAll();
      return;
    }
    const last = options.length - 1;
    setActive((current) => {
      const next = event.key === "ArrowDown" ? current + 1 : current - 1;
      return Math.max(0, Math.min(last, next));
    });
  }

  return (
    <div
      ref={root}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <input
        name="group"
        role="combobox"
        aria-expanded={visible}
        aria-controls="group-options"
        aria-autocomplete="list"
        aria-activedescendant={
          visible && highlighted ? `group-option-${highlighted.id}` : undefined
        }
        maxLength={60}
        value={value}
        placeholder="Optional"
        autoComplete="off"
        onChange={(event) => {
          setValue(event.target.value);
          setBrowsing(false);
          setActive(0);
          setOpen(true);
        }}
        onFocus={showAll}
        onKeyDown={onKeyDown}
        className={`${FIELD} w-full pr-9`}
      />
      {groups.length > 0 && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Show groups"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (open && browsing) setOpen(false);
            else showAll();
          }}
          className="absolute top-1 right-1 flex h-8 w-8 items-center justify-center rounded-[4px] text-muted hover:bg-hover"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      )}
      {visible && (
        <ul
          id="group-options"
          role="listbox"
          className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-[4px] border border-border bg-surface py-1"
        >
          {options.map((group, index) => {
            const selected = group.id === highlighted?.id;
            return (
              <li
                key={group.id}
                id={`group-option-${group.id}`}
                role="option"
                aria-selected={selected}
              >
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(group.name)}
                  className={`block w-full px-3 py-1.5 text-left text-sm ${
                    selected ? "bg-hover" : "hover:bg-hover"
                  }`}
                >
                  {group.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
