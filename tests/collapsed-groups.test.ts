import { describe, expect, it } from "vitest";
import {
  parseCollapsedGroups,
  serializeCollapsedGroups,
  UNGROUPED_GROUP_ID,
} from "@/lib/collapsed-groups";

const groupA = "11111111-1111-4111-8111-111111111111";
const groupB = "22222222-2222-4222-8222-222222222222";

describe("parseCollapsedGroups", () => {
  it("returns an empty set for missing values", () => {
    expect(parseCollapsedGroups(undefined)).toEqual(new Set());
    expect(parseCollapsedGroups(null)).toEqual(new Set());
    expect(parseCollapsedGroups("")).toEqual(new Set());
  });

  it("reads group ids and the ungrouped sentinel", () => {
    expect(parseCollapsedGroups(`${groupA}|${UNGROUPED_GROUP_ID}`)).toEqual(
      new Set([groupA, UNGROUPED_GROUP_ID]),
    );
  });

  it("ignores junk", () => {
    expect(parseCollapsedGroups(`${groupA}|not-an-id|;alert(1)`)).toEqual(
      new Set([groupA]),
    );
  });
});

describe("serializeCollapsedGroups", () => {
  it("writes a stable cookie value", () => {
    expect(
      serializeCollapsedGroups(new Set([groupB, UNGROUPED_GROUP_ID, groupA])),
    ).toBe(`${groupA}|${groupB}|${UNGROUPED_GROUP_ID}`);
  });

  it("round-trips with parse", () => {
    const ids = new Set([groupA, UNGROUPED_GROUP_ID]);
    expect(parseCollapsedGroups(serializeCollapsedGroups(ids))).toEqual(ids);
  });
});
