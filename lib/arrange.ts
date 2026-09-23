import { eq, isNull } from "drizzle-orm";
import type { DatabaseClient } from "./db";
import { groups, habits } from "./db/schema";
import {
  OrderError,
  parseVisiblePlacement,
  placeVisible,
  type Arrangement,
} from "./order";

export function applyArrangement(
  db: DatabaseClient,
  arrangement: Arrangement,
): void {
  db.transaction((tx) => {
    if (arrangement.kind === "groups") {
      const lane = tx
        .select()
        .from(groups)
        .orderBy(groups.sortOrder, groups.id)
        .all();
      const placed = placedLane(lane, arrangement.orderedIds, () => true);
      if (!placed) return;
      placed.forEach((row, index) => {
        tx.update(groups)
          .set({ sortOrder: index })
          .where(eq(groups.id, row.id))
          .run();
      });
      return;
    }

    const lane = tx
      .select()
      .from(habits)
      .where(
        arrangement.groupId === null
          ? isNull(habits.groupId)
          : eq(habits.groupId, arrangement.groupId),
      )
      .orderBy(habits.sortOrder, habits.id)
      .all();
    const placed = placedLane(lane, arrangement.orderedIds, (row) =>
      arrangement.shown === "archived"
        ? row.archivedAt != null
        : row.archivedAt == null,
    );
    if (!placed) return;
    placed.forEach((row, index) => {
      tx.update(habits)
        .set({ sortOrder: index })
        .where(eq(habits.id, row.id))
        .run();
    });
  });
}

function placedLane<T extends { readonly id: string }>(
  lane: readonly T[],
  orderedIds: readonly string[],
  isVisible: (member: T) => boolean,
): readonly T[] | null {
  const parsed = parseVisiblePlacement(lane, orderedIds, isVisible);
  if (!parsed.ok) throw new OrderError(parsed.rejection);
  const placed = placeVisible(parsed.placement);
  const unchanged = placed.every(
    (member, index) => member.id === lane[index].id,
  );
  return unchanged ? null : placed;
}
