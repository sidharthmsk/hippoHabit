import { describe, expect, it } from "vitest";
import { isPriority, parsePriority, PRIORITY_RANK } from "@/lib/priority";

describe("parsePriority", () => {
  it("accepts high, medium, and low", () => {
    expect(parsePriority("high")).toBe("high");
    expect(parsePriority("medium")).toBe("medium");
    expect(parsePriority("low")).toBe("low");
  });

  it("defaults unknown values to medium", () => {
    expect(parsePriority("urgent")).toBe("medium");
    expect(parsePriority("")).toBe("medium");
    expect(parsePriority(null)).toBe("medium");
  });
});

describe("isPriority", () => {
  it("rejects unknown slugs", () => {
    expect(isPriority("high")).toBe(true);
    expect(isPriority("tags")).toBe(false);
  });
});

describe("PRIORITY_RANK", () => {
  it("sorts high before medium before low", () => {
    expect(PRIORITY_RANK.high).toBeLessThan(PRIORITY_RANK.medium);
    expect(PRIORITY_RANK.medium).toBeLessThan(PRIORITY_RANK.low);
  });
});
