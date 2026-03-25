/**
 * crdt-merge: Conflict-free merge, dedup & diff for any dataset — powered by CRDTs.
 *
 * Usage:
 *   import { merge, dedup, diff, mergeDicts } from 'crdt-merge';
 *
 *   // Merge two arrays of objects
 *   const merged = merge(dataA, dataB, { key: 'id' });
 *
 *   // Deduplicate
 *   const { unique, duplicates } = dedup(items);
 *
 *   // See what changed
 *   const changes = diff(dataA, dataB, { key: 'id' });
 *
 *   // Merge JSON/objects
 *   const result = mergeDicts(configA, configB);
 */
export declare const VERSION = "0.1.0";
export { GCounter, PNCounter, LWWRegister, ORSet, LWWMap } from './core';
export type { GCounterJSON, PNCounterJSON, LWWRegisterJSON, ORSetJSON, LWWMapJSON } from './core';
export { merge } from './merge';
export type { MergeOptions } from './merge';
export { dedup, jaccardSimilarity } from './dedup';
export type { DedupOptions, DedupResult, DuplicateInfo } from './dedup';
export { diff } from './diff';
export type { DiffOptions, DiffResult, ModifiedEntry, FieldChange } from './diff';
export { mergeDicts } from './json-merge';
export type { MergeDictsOptions } from './json-merge';
