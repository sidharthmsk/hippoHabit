export const COLLAPSED_GROUPS_COOKIE = "collapsed-groups";
export const UNGROUPED_GROUP_ID = "ungrouped";

const ID_PATTERN =
  /^(ungrouped|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export function parseCollapsedGroups(value?: string | null): Set<string> {
  if (!value) return new Set();
  const ids = new Set<string>();
  for (const part of value.split("|")) {
    const id = part.trim();
    if (ID_PATTERN.test(id)) ids.add(id);
  }
  return ids;
}

export function serializeCollapsedGroups(ids: Iterable<string>): string {
  return [...ids].filter((id) => ID_PATTERN.test(id)).sort().join("|");
}

export function writeCollapsedGroupsCookie(ids: Iterable<string>) {
  const value = serializeCollapsedGroups(ids);
  document.cookie = `${COLLAPSED_GROUPS_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
