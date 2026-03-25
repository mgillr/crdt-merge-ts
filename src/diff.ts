/**
 * Structural diff between two datasets — shows what changed.
 */

export interface DiffOptions {
  /** Primary key field (default: "id"). */
  key?: string;
}

export interface FieldChange {
  from: any;
  to: any;
}

export interface ModifiedEntry<T> {
  key: any;
  before: T;
  after: T;
  changes: Record<string, FieldChange>;
}

export interface DiffResult<T> {
  added: T[];
  removed: T[];
  modified: ModifiedEntry<T>[];
  unchanged: T[];
  summary: string;
}

/**
 * Compute the structural diff between two arrays of objects.
 *
 * @param a First dataset (before)
 * @param b Second dataset (after)
 * @param options Diff options
 * @returns Diff result with added, removed, modified, unchanged
 */
export function diff<T extends Record<string, any>>(
  a: T[],
  b: T[],
  options?: DiffOptions,
): DiffResult<T> {
  const key = options?.key ?? 'id';

  const indexA = new Map<any, T>();
  for (const row of a) {
    const k = row[key];
    if (k !== undefined && k !== null) indexA.set(k, row);
  }

  const indexB = new Map<any, T>();
  for (const row of b) {
    const k = row[key];
    if (k !== undefined && k !== null) indexB.set(k, row);
  }

  const added: T[] = [];
  const removed: T[] = [];
  const modified: ModifiedEntry<T>[] = [];
  const unchanged: T[] = [];

  // Removed: in A but not in B
  for (const [k, row] of indexA) {
    if (!indexB.has(k)) {
      removed.push(row);
    }
  }

  // Added: in B but not in A
  for (const [k, row] of indexB) {
    if (!indexA.has(k)) {
      added.push(row);
    }
  }

  // Modified / Unchanged: in both
  for (const [k, rowA] of indexA) {
    const rowB = indexB.get(k);
    if (!rowB) continue;

    const allCols = new Set([...Object.keys(rowA), ...Object.keys(rowB)]);
    const changes: Record<string, FieldChange> = {};

    for (const col of allCols) {
      const va = rowA[col];
      const vb = rowB[col];
      if (!deepEqual(va, vb)) {
        changes[col] = { from: va, to: vb };
      }
    }

    if (Object.keys(changes).length > 0) {
      modified.push({ key: k, before: rowA, after: rowB, changes });
    } else {
      unchanged.push(rowA);
    }
  }

  const summary = `+${added.length} added, -${removed.length} removed, ~${modified.length} modified, =${unchanged.length} unchanged`;

  return { added, removed, modified, unchanged, summary };
}

/**
 * Simple deep equality check.
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (Array.isArray(a) || Array.isArray(b)) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true;
}
