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
  checkins: string[];
  currentStreak: number;
};

export type HabitDetail = HabitListItem & {
  longestStreak: number;
  allCheckins: string[];
};

export type NavData = {
  groups: Group[];
};
