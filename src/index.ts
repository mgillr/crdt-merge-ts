// Copyright 2026 Ryan Gillespie
// SPDX-License-Identifier: Apache-2.0
//
// Commercial licensing: data@optitransfer.ch, rgillespie83@icloud.com

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

export const VERSION = '0.1.0';

// Core CRDT types
export { GCounter, PNCounter, LWWRegister, ORSet, LWWMap } from './core';
export type { GCounterJSON, PNCounterJSON, LWWRegisterJSON, ORSetJSON, LWWMapJSON } from './core';

// Tabular merge
export { merge } from './merge';
export type { MergeOptions } from './merge';

// Deduplication
export { dedup, jaccardSimilarity } from './dedup';
export type { DedupOptions, DedupResult, DuplicateInfo } from './dedup';

// Diff
export { diff } from './diff';
export type { DiffOptions, DiffResult, ModifiedEntry, FieldChange } from './diff';

// JSON merge
export { mergeDicts } from './json-merge';
export type { MergeDictsOptions } from './json-merge';
