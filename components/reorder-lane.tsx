"use client";

import { commitArrangement } from "@/lib/actions";
import {
  GripIcon,
  gripClassName,
  useManualOrder,
  type GripBindings,
} from "./reorderable";

export function useGroupLane(groupIds: readonly string[]) {
  return useManualOrder(groupIds, (orderedIds) =>
    commitArrangement({
      kind: "groups",
      orderedIds: [...orderedIds],
    }),
  );
}

export function useHabitLane(
  groupId: string | null,
  shown: "active" | "archived",
  habitIds: readonly string[],
) {
  return useManualOrder(habitIds, (orderedIds) =>
    commitArrangement({
      kind: "habits",
      groupId,
      shown,
      orderedIds: [...orderedIds],
    }),
  );
}

export function ReorderGrip({
  label,
  ...bindings
}: { label: string } & GripBindings) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-keyshortcuts="ArrowUp ArrowDown"
      className={gripClassName}
      {...bindings}
    >
      <GripIcon />
    </button>
  );
}
