export const PRIORITIES = ["high", "medium", "low"] as const;

export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const PRIORITY_RANK: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function isPriority(value: string): value is Priority {
  return (PRIORITIES as readonly string[]).includes(value);
}

export function parsePriority(value: unknown): Priority {
  if (typeof value === "string" && isPriority(value)) return value;
  return "medium";
}
