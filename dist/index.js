"use strict";
// Copyright 2026 Ryan Gillespie
// SPDX-License-Identifier: Apache-2.0
//
// Commercial licensing: data@optitransfer.ch, rgillespie83@icloud.com
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeDicts = exports.diff = exports.jaccardSimilarity = exports.dedup = exports.merge = exports.emitCanonical = exports.canonicalize = exports.Fact = exports.AgentState = exports.LWWMap = exports.ORSet = exports.LWWRegister = exports.PNCounter = exports.GCounter = exports.VERSION = void 0;
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
exports.VERSION = '0.3.0';
// Core CRDT types
var core_1 = require("./core");
Object.defineProperty(exports, "GCounter", { enumerable: true, get: function () { return core_1.GCounter; } });
Object.defineProperty(exports, "PNCounter", { enumerable: true, get: function () { return core_1.PNCounter; } });
Object.defineProperty(exports, "LWWRegister", { enumerable: true, get: function () { return core_1.LWWRegister; } });
Object.defineProperty(exports, "ORSet", { enumerable: true, get: function () { return core_1.ORSet; } });
Object.defineProperty(exports, "LWWMap", { enumerable: true, get: function () { return core_1.LWWMap; } });
// Agent state and the canonical wire form
var agent_state_1 = require("./agent-state");
Object.defineProperty(exports, "AgentState", { enumerable: true, get: function () { return agent_state_1.AgentState; } });
Object.defineProperty(exports, "Fact", { enumerable: true, get: function () { return agent_state_1.Fact; } });
var canonical_1 = require("./canonical");
Object.defineProperty(exports, "canonicalize", { enumerable: true, get: function () { return canonical_1.canonicalize; } });
Object.defineProperty(exports, "emitCanonical", { enumerable: true, get: function () { return canonical_1.emitCanonical; } });
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
