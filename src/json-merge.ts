/**
 * Deep conflict-free JSON/object merge using CRDT semantics.
 *
 * Handles nested objects, arrays, and mixed types. Each leaf is treated as an
 * LWW Register — if both sides set a value, the one with the later timestamp
 * (or side B by default) wins.
 */

export interface MergeDictsOptions {
  /** Merge strategy (default: "deep"). */
  strategy?: 'lww' | 'deep' | 'keep_a' | 'keep_b';
  /** Timestamps for LWW resolution. */
  timestamps?: { a?: number; b?: number };
}

/**
 * Create a hashable key for a list item (for dedup in array merging).
 */
function listItemKey(item: any): string {
  if (item === null || item === undefined) return String(item);
  if (typeof item === 'object' && !Array.isArray(item)) {
    return JSON.stringify(
      Object.keys(item)
        .sort()
        .map(k => [k, String(item[k])]),
    );
  }
  if (Array.isArray(item)) {
    return JSON.stringify(item.map(i => String(i)));
  }
  return String(item);
}

/**
 * Merge two arrays: concatenate and deduplicate by value while preserving order.
 */
function mergeLists(a: any[], b: any[]): any[] {
  const seen = new Set<string>();
  const result: any[] = [];
  for (const item of [...a, ...b]) {
    const key = listItemKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

/**
 * Deep clone a value.
 */
function deepClone<T>(val: T): T {
  if (val === null || val === undefined || typeof val !== 'object') return val;
  return JSON.parse(JSON.stringify(val));
}

/**
 * Deep merge two objects with CRDT LWW semantics.
 *
 * Keys unique to either side: preserved.
 * Keys in both: recursively merged if objects, LWW if scalars.
 * Arrays: concatenated and deduped.
 *
 * @param a First object
 * @param b Second object
 * @param options Merge options
 * @returns Merged object
 */
export function mergeDicts<T extends Record<string, any>>(
  a: T,
  b: T,
  options?: MergeDictsOptions,
): T {
  const strategy = options?.strategy ?? 'deep';
  const tsA = options?.timestamps?.a ?? 0;
  const tsB = options?.timestamps?.b ?? 1; // B wins by default

  // Short-circuit strategies
  if (strategy === 'keep_a') return deepClone(a);
  if (strategy === 'keep_b') return deepClone(b);

  return mergeDeep(a, b, strategy, tsA, tsB) as T;
}

function mergeDeep(
  a: Record<string, any>,
  b: Record<string, any>,
  strategy: 'lww' | 'deep',
  tsA: number,
  tsB: number,
): Record<string, any> {
  const result: Record<string, any> = {};
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of allKeys) {
    const valA = a[key];
    const valB = b[key];

    if (!(key in a)) {
      result[key] = deepClone(valB);
    } else if (!(key in b)) {
      result[key] = deepClone(valA);
    } else if (
      typeof valA === 'object' && valA !== null && !Array.isArray(valA) &&
      typeof valB === 'object' && valB !== null && !Array.isArray(valB)
    ) {
      // Both are plain objects — recurse
      result[key] = mergeDeep(valA, valB, strategy, tsA, tsB);
    } else if (Array.isArray(valA) && Array.isArray(valB)) {
      // Both are arrays — union
      result[key] = mergeLists(valA, valB);
    } else if (deepEquals(valA, valB)) {
      result[key] = deepClone(valA);
    } else {
      // Conflict — resolve
      if (strategy === 'lww') {
        result[key] = tsB >= tsA ? deepClone(valB) : deepClone(valA);
      } else {
        // 'deep' strategy: B wins for scalar conflicts (like Python version)
        result[key] = deepClone(valB);
      }
    }
  }

  return result;
}

function deepEquals(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((v: any, i: number) => deepEquals(v, b[i]));
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k => deepEquals(a[k], b[k]));
}
