import { PRIORITY_RANK, type Priority } from "./priority";

export type { Priority };

export type Arrangement =
  | {
      readonly kind: "groups";
      readonly orderedIds: readonly string[];
    }
  | {
      readonly kind: "habits";
      readonly groupId: string | null;
      readonly shown: "active" | "archived";
      readonly orderedIds: readonly string[];
    };

const placementBrand = Symbol("visible-placement");

export type VisiblePlacement<T extends { readonly id: string }> = {
  readonly [placementBrand]: true;
  readonly lane: readonly T[];
  readonly visible: readonly T[];
};

export type OrderRejection =
  | "duplicate"
  | "unknown"
  | "hidden"
  | "missing"
  | "malformed";

export type PlacementResult<T extends { readonly id: string }> =
  | { readonly ok: true; readonly placement: VisiblePlacement<T> }
  | { readonly ok: false; readonly rejection: Exclude<OrderRejection, "malformed"> };

export class OrderError extends Error {
  readonly rejection: OrderRejection;

  constructor(rejection: OrderRejection) {
    super(rejection);
    this.name = "OrderError";
    this.rejection = rejection;
  }
}

export function parseArrangement(input: unknown): Arrangement | null {
  if (!isRecord(input)) return null;
  if (input.kind === "groups") {
    const orderedIds = parseIdList(input.orderedIds);
    if (!orderedIds) return null;
    return { kind: "groups", orderedIds };
  }
  if (input.kind === "habits") {
    const groupId = input.groupId;
    if (groupId !== null && typeof groupId !== "string") return null;
    if (input.shown !== "active" && input.shown !== "archived") return null;
    const orderedIds = parseIdList(input.orderedIds);
    if (!orderedIds) return null;
    return { kind: "habits", groupId, shown: input.shown, orderedIds };
  }
  return null;
}

export function parseVisiblePlacement<T extends { readonly id: string }>(
  lane: readonly T[],
  postedIds: readonly string[],
  isVisible: (member: T) => boolean,
): PlacementResult<T> {
  const byId = new Map<string, T>();
  for (const member of lane) {
    if (!byId.has(member.id)) byId.set(member.id, member);
  }

  const seen = new Set<string>();
  const visible: T[] = [];
  for (const id of postedIds) {
    if (seen.has(id)) return { ok: false, rejection: "duplicate" };
    seen.add(id);
    const member = byId.get(id);
    if (!member) return { ok: false, rejection: "unknown" };
    if (!isVisible(member)) return { ok: false, rejection: "hidden" };
    visible.push(member);
  }

  for (const member of lane) {
    if (isVisible(member) && !seen.has(member.id)) {
      return { ok: false, rejection: "missing" };
    }
  }

  return {
    ok: true,
    placement: {
      [placementBrand]: true,
      lane,
      visible,
    },
  };
}

export function placeVisible<T extends { readonly id: string }>(
  placement: VisiblePlacement<T>,
): readonly T[] {
  const visibleIds = new Set(placement.visible.map((member) => member.id));
  const slots: number[] = [];
  for (let index = 0; index < placement.lane.length; index++) {
    if (visibleIds.has(placement.lane[index].id)) slots.push(index);
  }
  const next = placement.lane.slice();
  for (let index = 0; index < slots.length; index++) {
    next[slots[index]] = placement.visible[index];
  }
  return next;
}

export function compareManual(
  a: { readonly sortOrder: number; readonly id: string },
  b: { readonly sortOrder: number; readonly id: string },
): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return compareSqliteText(a.id, b.id);
}

export function sectionRank(
  groupId: string | null,
  groupIndex: ReadonlyMap<string, number>,
  groupCount: number,
): number {
  if (groupId == null) return groupCount;
  return groupIndex.get(groupId) ?? groupCount;
}

export function nextSortOrder(existing: readonly number[]): number {
  if (existing.length === 0) return 0;
  let max = existing[0];
  for (let index = 1; index < existing.length; index++) {
    if (existing[index] > max) max = existing[index];
  }
  return max + 1;
}

export function compareSqliteText(a: string, b: string): number {
  return Buffer.from(a, "utf8").compare(Buffer.from(b, "utf8"));
}

export type MigrationGroup = {
  readonly id: string;
  readonly name: string;
  readonly sortOrder: number;
};

export type MigrationHabit = {
  readonly id: string;
  readonly name: string;
  readonly groupId: string | null;
  readonly priority: Priority;
  readonly sortOrder: number;
  readonly createdAt: number;
};

export type AssignedOrder = {
  readonly id: string;
  readonly sortOrder: number;
};

export function materializeDisplayOrder(
  groups: readonly MigrationGroup[],
  habits: readonly MigrationHabit[],
): {
  readonly groups: readonly AssignedOrder[];
  readonly habits: readonly AssignedOrder[];
} {
  const sortedGroups = [...groups].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    const name = compareSqliteText(a.name, b.name);
    if (name !== 0) return name;
    return compareId(a.id, b.id);
  });

  const lanes = new Map<string | null, MigrationHabit[]>();
  for (const habit of habits) {
    const lane = lanes.get(habit.groupId);
    if (lane) lane.push(habit);
    else lanes.set(habit.groupId, [habit]);
  }

  const assignedHabits: AssignedOrder[] = [];
  for (const lane of lanes.values()) {
    const sorted = [...lane].sort(compareMigrationHabit);
    sorted.forEach((habit, index) => {
      assignedHabits.push({ id: habit.id, sortOrder: index });
    });
  }

  return {
    groups: sortedGroups.map((group, index) => ({
      id: group.id,
      sortOrder: index,
    })),
    habits: assignedHabits,
  };
}

export function targetIndex(
  pointerY: number,
  midpoints: readonly number[],
): number {
  if (midpoints.length === 0) return 0;
  let best = 0;
  let bestDistance = Math.abs(pointerY - midpoints[0]);
  for (let index = 1; index < midpoints.length; index++) {
    const distance = Math.abs(pointerY - midpoints[index]);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  }
  if (best < 0) return 0;
  if (best >= midpoints.length) return midpoints.length - 1;
  return best;
}

export function moveId(
  ids: readonly string[],
  id: string,
  toIndex: number,
): readonly string[] {
  const from = ids.indexOf(id);
  if (from < 0 || ids.length === 0) return ids.slice();
  const to = Math.max(0, Math.min(ids.length - 1, toIndex));
  if (from === to) return ids.slice();
  const next = ids.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function compareMigrationHabit(a: MigrationHabit, b: MigrationHabit): number {
  const priority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (priority !== 0) return priority;
  const name = a.name.localeCompare(b.name);
  if (name !== 0) return name;
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
  return compareId(a.id, b.id);
}

function compareId(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function parseIdList(value: unknown): readonly string[] | null {
  if (!Array.isArray(value)) return null;
  const ids: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") return null;
    ids.push(entry);
  }
  return ids;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
