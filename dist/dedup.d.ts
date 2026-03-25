/**
 * High-performance deduplication powered by CRDT OR-Sets.
 *
 * Methods:
 *   - Exact dedup: normalized string comparison
 *   - Fuzzy dedup: Jaccard similarity on character bigrams
 */
export interface DedupOptions<T> {
    /** Field name or custom key extractor for comparison. */
    key?: string | ((item: T) => string);
    /** Similarity threshold 0–1 (default: 0.85). */
    threshold?: number;
    /** Whether comparison is case sensitive (default: false). */
    caseSensitive?: boolean;
}
export interface DuplicateInfo<T> {
    item: T;
    matchedWith: T;
    similarity: number;
}
export interface DedupResult<T> {
    unique: T[];
    duplicates: DuplicateInfo<T>[];
}
/**
 * Jaccard similarity between two strings (via character bigrams).
 */
export declare function jaccardSimilarity(a: string, b: string): number;
/**
 * Deduplicate an array of items using exact or fuzzy matching.
 *
 * @param items Items to deduplicate
 * @param options Dedup options
 * @returns Object with unique items and duplicate info
 */
export declare function dedup<T>(items: T[], options?: DedupOptions<T>): DedupResult<T>;
