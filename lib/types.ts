import type { Priority } from "./priority";

export type Group = {
  id: string;
  name: string;
};

export type HabitListItem = {
  id: string;
  name: string;
  groupId: string | null;
  groupName: string | null;
  priority: Priority;
  archived: boolean;
  /** Check-ins within the visible week only. */
  recent: string[];
  /** In weeks. */
  currentStreak: number;
};

export type HabitDetail = HabitListItem & {
  allCheckins: string[];
  /** In weeks. */
  longestStreak: number;
  total: number;
  /** 0–1, share of the last 30 days (or fewer, for a newer habit) that were checked. */
  rate30: number;
  /** 0–1, share of days since the habit started. */
  rateAll: number;
};

export type NavData = {
  groups: Group[];
};
