// Name matching. People and tools write names in many forms ("Grid/Data grid", "data grid", "DataGrid"), so
// a name is compared by its letters and digits alone; an unknown name gets the closest known ones.

/** "Grid/Data grid" → "griddatagrid": lowercase letters and digits only. */
export const norm = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "");

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

/** A known item: the label to show, and every form of its name. */
export interface Candidate {
  label: string;
  keys: string[];
}

/**
 * The closest candidates to a name that matched nothing: one that contains the name (or is contained in it)
 * and is of similar length first, then by edit distance. At most `limit`, and only names a typo away: a
 * different word for the same thing ("modal" for a dialog) is found by meaning instead (see suggest in tools.ts).
 */
export function closest(name: string, candidates: Candidate[], limit = 5): string[] {
  const query = norm(name);
  if (!query) return [];
  const scored = candidates.map((candidate) => {
    let best = Infinity;
    for (const key of candidate.keys) {
      const k = norm(key);
      // One inside the other counts as close only when they are of similar length: "tab" is in "datatable",
      // but it isn't what was meant.
      const contains = (k.includes(query) || query.includes(k)) && Math.min(k.length, query.length) * 2 >= Math.max(k.length, query.length);
      best = Math.min(best, contains ? Math.abs(k.length - query.length) / 10 : distance(query, k));
    }
    return { label: candidate.label, score: best };
  });
  // A typo's worth of difference: one edit in a short name, a few in a long one.
  const allowed = Math.max(1, Math.floor(query.length / 4));
  return scored
    .filter((s) => s.score <= allowed)
    .sort((a, b) => a.score - b.score || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((s) => s.label);
}

/** An index from every form of a name to its item. Throws if two items share a form, so a clash fails the build's tests. */
export function indexBy<T>(items: T[], keysOf: (item: T) => string[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    for (const key of new Set(keysOf(item).map(norm))) {
      if (!key) continue;
      const existing = map.get(key);
      if (existing && existing !== item) throw new Error(`Two items answer to the name "${key}"`);
      map.set(key, item);
    }
  }
  return map;
}
