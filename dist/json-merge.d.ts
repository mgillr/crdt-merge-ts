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
    timestamps?: {
        a?: number;
        b?: number;
    };
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
export declare function mergeDicts<T extends Record<string, any>>(a: T, b: T, options?: MergeDictsOptions): T;
