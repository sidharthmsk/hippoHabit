import { describe, expect, it } from "vitest";
import {
  compareManual,
  compareSqliteText,
  materializeDisplayOrder,
  moveId,
  nextSortOrder,
  parseArrangement,
  parseVisiblePlacement,
  placeVisible,
  sectionRank,
  targetIndex,
} from "@/lib/order";

const lane = [{ id: "run" }, { id: "floss-archived" }, { id: "read" }];
const visible = new Set(["run", "read"]);
const isVisible = (member: { id: string }) => visible.has(member.id);

function placedIds(posted: readonly string[]): readonly string[] {
  const parsed = parseVisiblePlacement(lane, posted, isVisible);
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return [];
  return placeVisible(parsed.placement).map((member) => member.id);
}

describe("placeVisible", () => {
  it("writes the posted order into the visible slots and leaves hidden rows", () => {
    expect(placedIds(["read", "run"])).toEqual([
      "read",
      "floss-archived",
      "run",
    ]);
  });

  it("returns the same id sequence when the posted order already matches", () => {
    expect(placedIds(["run", "read"])).toEqual([
      "run",
      "floss-archived",
      "read",
    ]);
  });
});

describe("parseVisiblePlacement", () => {
  it("rejects a duplicate, an unknown id, a hidden id, and a missing visible id", () => {
    expect(parseVisiblePlacement(lane, ["run", "read", "run"], isVisible)).toEqual(
      { ok: false, rejection: "duplicate" },
    );
    expect(
      parseVisiblePlacement(lane, ["run", "read", "nope"], isVisible),
    ).toEqual({ ok: false, rejection: "unknown" });
    expect(
      parseVisiblePlacement(
        lane,
        ["run", "floss-archived", "read"],
        isVisible,
      ),
    ).toEqual({ ok: false, rejection: "hidden" });
    expect(parseVisiblePlacement(lane, ["run"], isVisible)).toEqual({
      ok: false,
      rejection: "missing",
    });
  });
});

describe("moveId", () => {
  it("moves an id to an index and leaves it when the index is unchanged", () => {
    expect(moveId(["a", "b", "c"], "c", 0)).toEqual(["c", "a", "b"]);
    expect(moveId(["a", "b", "c"], "b", 1)).toEqual(["a", "b", "c"]);
    expect(moveId(["a", "b", "c"], "a", 2)).toEqual(["b", "c", "a"]);
  });
});

describe("targetIndex", () => {
  it("picks the nearest midpoint and clamps outside the list", () => {
    const midpoints = [10, 30, 50];
    expect(targetIndex(12, midpoints)).toBe(0);
    expect(targetIndex(29, midpoints)).toBe(1);
    expect(targetIndex(49, midpoints)).toBe(2);
    expect(targetIndex(-100, midpoints)).toBe(0);
    expect(targetIndex(1000, midpoints)).toBe(2);
    expect(targetIndex(20, [10, 30])).toBe(0);
  });
});

describe("materializeDisplayOrder", () => {
  it("densifies groups by stored order and habits by priority then name", () => {
    expect(
      materializeDisplayOrder(
        [
          { id: "mind", name: "Mind", sortOrder: 2 },
          { id: "body", name: "Body", sortOrder: 1 },
        ],
        [
          {
            id: "floss",
            name: "Floss",
            groupId: "body",
            priority: "low",
            sortOrder: 1,
            createdAt: 1,
          },
          {
            id: "run",
            name: "Run",
            groupId: "body",
            priority: "high",
            sortOrder: 2,
            createdAt: 2,
          },
          {
            id: "yoga",
            name: "Yoga",
            groupId: "body",
            priority: "high",
            sortOrder: 9,
            createdAt: 9,
          },
          {
            id: "read",
            name: "Read",
            groupId: "mind",
            priority: "medium",
            sortOrder: 3,
            createdAt: 3,
          },
        ],
      ),
    ).toEqual({
      groups: [
        { id: "body", sortOrder: 0 },
        { id: "mind", sortOrder: 1 },
      ],
      habits: [
        { id: "run", sortOrder: 0 },
        { id: "yoga", sortOrder: 1 },
        { id: "floss", sortOrder: 2 },
        { id: "read", sortOrder: 0 },
      ],
    });
  });

  it("keeps the lower sortOrder, then createdAt, then id when priority and name match", () => {
    const result = materializeDisplayOrder(
      [],
      [
        {
          id: "b",
          name: "Same",
          groupId: null,
          priority: "medium",
          sortOrder: 2,
          createdAt: 1,
        },
        {
          id: "d",
          name: "Same",
          groupId: null,
          priority: "medium",
          sortOrder: 1,
          createdAt: 9,
        },
        {
          id: "c",
          name: "Same",
          groupId: null,
          priority: "medium",
          sortOrder: 2,
          createdAt: 2,
        },
        {
          id: "a",
          name: "Same",
          groupId: null,
          priority: "medium",
          sortOrder: 2,
          createdAt: 1,
        },
      ],
    );
    expect(result.habits.map((habit) => habit.id)).toEqual(["d", "a", "b", "c"]);
    expect(result.habits.map((habit) => habit.sortOrder)).toEqual([0, 1, 2, 3]);
  });

  it("orders tied groups by UTF-8 name bytes, then id", () => {
    expect(compareSqliteText("A", "a")).toBeLessThan(0);
    expect(compareSqliteText("a", "A")).toBeGreaterThan(0);
    expect(compareSqliteText("Mind", "Mind")).toBe(0);
    expect(
      materializeDisplayOrder(
        [
          { id: "g-lower", name: "a", sortOrder: 0 },
          { id: "g-upper", name: "A", sortOrder: 0 },
        ],
        [],
      ).groups,
    ).toEqual([
      { id: "g-upper", sortOrder: 0 },
      { id: "g-lower", sortOrder: 1 },
    ]);
    expect(
      materializeDisplayOrder(
        [
          { id: "g-b", name: "AAA", sortOrder: 2 },
          { id: "g-a", name: "ZZZ", sortOrder: 1 },
        ],
        [],
      ).groups,
    ).toEqual([
      { id: "g-a", sortOrder: 0 },
      { id: "g-b", sortOrder: 1 },
    ]);
  });
});

describe("sectionRank", () => {
  it("puts null and unknown groups after the real ones", () => {
    const groupIndex = new Map([
      ["body", 0],
      ["mind", 1],
    ]);
    expect(sectionRank(null, groupIndex, 2)).toBe(2);
    expect(sectionRank("nope", groupIndex, 2)).toBe(2);
    expect(sectionRank("body", groupIndex, 2)).toBe(0);
  });
});

describe("nextSortOrder", () => {
  it("starts at 0 and otherwise returns one past the max", () => {
    expect(nextSortOrder([])).toBe(0);
    expect(nextSortOrder([0, 2])).toBe(3);
  });
});

describe("compareManual", () => {
  it("sorts by sortOrder, then id", () => {
    expect(
      [
        { id: "b", sortOrder: 1 },
        { id: "a", sortOrder: 1 },
        { id: "c", sortOrder: 0 },
      ]
        .sort(compareManual)
        .map((row) => row.id),
    ).toEqual(["c", "a", "b"]);
  });
});

describe("parseArrangement", () => {
  it("returns null for a malformed body and the object for a valid one", () => {
    expect(parseArrangement("groups")).toBe(null);
    expect(
      parseArrangement({
        kind: "habits",
        groupId: 4,
        shown: "active",
        orderedIds: ["h1"],
      }),
    ).toBe(null);
    expect(
      parseArrangement({
        kind: "groups",
        orderedIds: ["g1", 1],
      }),
    ).toBe(null);
    expect(
      parseArrangement({
        kind: "groups",
        orderedIds: ["g1", "g2"],
      }),
    ).toEqual({ kind: "groups", orderedIds: ["g1", "g2"] });
    expect(
      parseArrangement({
        kind: "habits",
        groupId: null,
        shown: "active",
        orderedIds: ["h1"],
      }),
    ).toEqual({
      kind: "habits",
      groupId: null,
      shown: "active",
      orderedIds: ["h1"],
    });
  });
});
