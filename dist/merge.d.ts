/**
 * CRDT-powered tabular merge — conflict-free merge of arrays of objects (like DataFrames).
 *
 * Handles:
 *   - Row-level merge by key column (matched rows: LWW per cell)
 *   - Rows unique to either side: preserved
 *   - Schema divergence: union of columns, missing filled with undefined
 */
export interface MergeOptions {
    /** Primary key field (default: "id"). */
    key?: string;
    /** Conflict resolution strategy (default: "lww"). */
    strategy?: 'lww' | 'keep_a' | 'keep_b';
    /** Timestamps for LWW resolution. */
    timestamps?: {
        a?: number;
        b?: number;
    };
}
/**
 * Merge two arrays of objects using CRDT semantics — conflict-free, deterministic, order-independent.
 *
 * @param a First dataset (array of objects)
 * @param b Second dataset (array of objects)
 * @param options Merge options
 * @returns Merged array, sorted by key
 */
export declare function merge<T extends Record<string, any>>(a: T[], b: T[], options?: MergeOptions): T[];
