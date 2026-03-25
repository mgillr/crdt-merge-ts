"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeDicts = exports.diff = exports.jaccardSimilarity = exports.dedup = exports.merge = exports.LWWMap = exports.ORSet = exports.LWWRegister = exports.PNCounter = exports.GCounter = exports.VERSION = void 0;
exports.VERSION = '0.1.0';
// Core CRDT types
var core_1 = require("./core");
Object.defineProperty(exports, "GCounter", { enumerable: true, get: function () { return core_1.GCounter; } });
Object.defineProperty(exports, "PNCounter", { enumerable: true, get: function () { return core_1.PNCounter; } });
Object.defineProperty(exports, "LWWRegister", { enumerable: true, get: function () { return core_1.LWWRegister; } });
Object.defineProperty(exports, "ORSet", { enumerable: true, get: function () { return core_1.ORSet; } });
Object.defineProperty(exports, "LWWMap", { enumerable: true, get: function () { return core_1.LWWMap; } });
// Tabular merge
var merge_1 = require("./merge");
Object.defineProperty(exports, "merge", { enumerable: true, get: function () { return merge_1.merge; } });
// Deduplication
var dedup_1 = require("./dedup");
Object.defineProperty(exports, "dedup", { enumerable: true, get: function () { return dedup_1.dedup; } });
Object.defineProperty(exports, "jaccardSimilarity", { enumerable: true, get: function () { return dedup_1.jaccardSimilarity; } });
// Diff
var diff_1 = require("./diff");
Object.defineProperty(exports, "diff", { enumerable: true, get: function () { return diff_1.diff; } });
// JSON merge
var json_merge_1 = require("./json-merge");
Object.defineProperty(exports, "mergeDicts", { enumerable: true, get: function () { return json_merge_1.mergeDicts; } });
