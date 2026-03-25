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
export declare function diff<T extends Record<string, any>>(a: T[], b: T[], options?: DiffOptions): DiffResult<T>;
