"use strict";
/**
 * Core CRDT primitives — mathematically proven conflict-free replicated data types.
 *
 * Every type here satisfies the CRDT convergence theorem:
 *   - Commutative:  merge(A, B) == merge(B, A)
 *   - Associative:  merge(merge(A, B), C) == merge(A, merge(B, C))
 *   - Idempotent:   merge(A, A) == A
 *
 * This means ANY number of replicas can merge in ANY order and ALWAYS converge
 * to the same correct state — no coordination, no locks, no conflicts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LWWMap = exports.ORSet = exports.LWWRegister = exports.PNCounter = exports.GCounter = void 0;
// Simple UUID-like random hex generator
function randomHex(len) {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < len; i++) {
        result += chars[Math.floor(Math.random() * 16)];
    }
    return result;
}
/**
 * Grow-only counter. Each node has its own slot; value = sum of all slots.
 *
 * Perfect for: page views, download counts, event counters — anything that only goes up.
 */
class GCounter {
    constructor(nodeId, initial) {
        this._counts = new Map();
        if (nodeId && initial !== undefined && initial > 0) {
            this._counts.set(nodeId, initial);
        }
    }
    /** Current value (sum of all node counts). */
    get value() {
        let sum = 0;
        for (const v of this._counts.values())
            sum += v;
        return sum;
    }
    /** Increment the counter for a given node. */
    increment(nodeId, amount = 1) {
        if (amount < 0)
            throw new Error('GCounter only supports non-negative increments');
        this._counts.set(nodeId, (this._counts.get(nodeId) ?? 0) + amount);
    }
    /** Merge with another GCounter — returns a new merged GCounter. */
    merge(other) {
        const result = new GCounter();
        const allKeys = new Set([...this._counts.keys(), ...other._counts.keys()]);
        for (const k of allKeys) {
            result._counts.set(k, Math.max(this._counts.get(k) ?? 0, other._counts.get(k) ?? 0));
        }
        return result;
    }
    toJSON() {
        const counts = {};
        for (const [k, v] of this._counts)
            counts[k] = v;
        return { type: 'g_counter', counts };
    }
    static fromJSON(d) {
        const c = new GCounter();
        for (const [k, v] of Object.entries(d.counts ?? {})) {
            c._counts.set(k, v);
        }
        return c;
    }
    toString() {
        return `GCounter(value=${this.value}, nodes=${this._counts.size})`;
    }
}
exports.GCounter = GCounter;
/**
 * Positive-Negative counter — supports both increment and decrement.
 *
 * Internally two G-Counters: one for increments, one for decrements.
 * Perfect for: stock levels, balance tracking, bidirectional counters.
 */
class PNCounter {
    constructor() {
        this._pos = new GCounter();
        this._neg = new GCounter();
    }
    /** Current value (increments minus decrements). */
    get value() {
        return this._pos.value - this._neg.value;
    }
    increment(nodeId, amount = 1) {
        this._pos.increment(nodeId, amount);
    }
    decrement(nodeId, amount = 1) {
        this._neg.increment(nodeId, amount);
    }
    merge(other) {
        const result = new PNCounter();
        result._pos = this._pos.merge(other._pos);
        result._neg = this._neg.merge(other._neg);
        return result;
    }
    toJSON() {
        return { type: 'pn_counter', pos: this._pos.toJSON(), neg: this._neg.toJSON() };
    }
    static fromJSON(d) {
        const c = new PNCounter();
        c._pos = GCounter.fromJSON(d.pos);
        c._neg = GCounter.fromJSON(d.neg);
        return c;
    }
    toString() {
        return `PNCounter(value=${this.value})`;
    }
}
exports.PNCounter = PNCounter;
/**
 * Last-Writer-Wins Register — stores a single value, latest timestamp wins.
 *
 * Perfect for: single-cell updates (name, email, status), any scalar field.
 */
class LWWRegister {
    constructor(value = null, timestamp = 0, nodeId = '') {
        this._value = value;
        this._timestamp = timestamp;
        this._nodeId = nodeId;
    }
    get value() {
        return this._value;
    }
    get timestamp() {
        return this._timestamp;
    }
    get nodeId() {
        return this._nodeId;
    }
    set(value, timestamp, nodeId = '') {
        const ts = timestamp ?? Date.now() / 1000;
        this._value = value;
        this._timestamp = ts;
        this._nodeId = nodeId;
    }
    merge(other) {
        if (other._timestamp > this._timestamp) {
            return new LWWRegister(other._value, other._timestamp, other._nodeId);
        }
        else if (other._timestamp === this._timestamp) {
            // Tie-break on nodeId for determinism
            if (other._nodeId > this._nodeId) {
                return new LWWRegister(other._value, other._timestamp, other._nodeId);
            }
        }
        return new LWWRegister(this._value, this._timestamp, this._nodeId);
    }
    toJSON() {
        return { type: 'lww_register', value: this._value, timestamp: this._timestamp, node_id: this._nodeId };
    }
    static fromJSON(d) {
        return new LWWRegister(d.value, d.timestamp, d.node_id ?? '');
    }
    toString() {
        return `LWWRegister(value=${JSON.stringify(this._value)}, ts=${this._timestamp})`;
    }
}
exports.LWWRegister = LWWRegister;
/**
 * Observed-Remove Set — add and remove elements without conflicts.
 *
 * Each element is tagged with a unique ID on add. Remove kills specific tags,
 * so concurrent add+remove of the same element resolves correctly (add wins
 * over concurrent remove — the "add-wins" semantics).
 *
 * Perfect for: membership lists, tag sets, deduplication sets.
 */
class ORSet {
    constructor() {
        this._elements = new Map();
    }
    /** Current set of live elements. */
    get value() {
        const result = new Set();
        for (const [e, tags] of this._elements) {
            if (tags.size > 0)
                result.add(e);
        }
        return result;
    }
    /** Add an element, returning its unique tag. */
    add(element) {
        const tag = randomHex(12);
        if (!this._elements.has(element)) {
            this._elements.set(element, new Set());
        }
        this._elements.get(element).add(tag);
        return tag;
    }
    /** Remove an element (clears all known tags). */
    remove(element) {
        if (this._elements.has(element)) {
            this._elements.set(element, new Set());
        }
    }
    /** Check if element is in the set. */
    contains(element) {
        const tags = this._elements.get(element);
        return tags !== undefined && tags.size > 0;
    }
    /** Merge with another ORSet — union of all tags per element. */
    merge(other) {
        const result = new ORSet();
        const allElements = new Set([...this._elements.keys(), ...other._elements.keys()]);
        for (const e of allElements) {
            const tagsA = this._elements.get(e) ?? new Set();
            const tagsB = other._elements.get(e) ?? new Set();
            result._elements.set(e, new Set([...tagsA, ...tagsB]));
        }
        return result;
    }
    toJSON() {
        const elements = {};
        for (const [k, v] of this._elements) {
            elements[String(k)] = [...v];
        }
        return { type: 'or_set', elements };
    }
    static fromJSON(d) {
        const s = new ORSet();
        for (const [k, tags] of Object.entries(d.elements ?? {})) {
            s._elements.set(k, new Set(tags));
        }
        return s;
    }
    toString() {
        return `ORSet(size=${this.value.size})`;
    }
}
exports.ORSet = ORSet;
/**
 * Last-Writer-Wins Map — a dictionary where each key is an LWW Register.
 *
 * Concurrent writes to different keys: both preserved.
 * Concurrent writes to same key: latest timestamp wins.
 *
 * Perfect for: row-level merges, metadata dicts, config objects.
 */
class LWWMap {
    constructor() {
        this._registers = new Map();
        this._tombstones = new Map();
    }
    set(key, value, timestamp, nodeId = '') {
        const ts = timestamp ?? Date.now() / 1000;
        if (!this._registers.has(key)) {
            this._registers.set(key, new LWWRegister());
        }
        this._registers.get(key).set(value, ts, nodeId);
        // Remove tombstone if this write is newer
        const tomb = this._tombstones.get(key);
        if (tomb !== undefined && ts > tomb) {
            this._tombstones.delete(key);
        }
    }
    get(key, defaultValue = null) {
        if (this._tombstones.has(key))
            return defaultValue;
        const reg = this._registers.get(key);
        return reg ? reg.value : defaultValue;
    }
    delete(key, timestamp) {
        const ts = timestamp ?? Date.now() / 1000;
        this._tombstones.set(key, ts);
    }
    get value() {
        const result = {};
        for (const [k, reg] of this._registers) {
            const tomb = this._tombstones.get(k);
            if (tomb === undefined || reg.timestamp > tomb) {
                result[k] = reg.value;
            }
        }
        return result;
    }
    merge(other) {
        const result = new LWWMap();
        const allKeys = new Set([...this._registers.keys(), ...other._registers.keys()]);
        for (const k of allKeys) {
            const a = this._registers.get(k);
            const b = other._registers.get(k);
            if (a && b) {
                result._registers.set(k, a.merge(b));
            }
            else if (a) {
                result._registers.set(k, new LWWRegister(a.value, a.timestamp, a.nodeId));
            }
            else if (b) {
                result._registers.set(k, new LWWRegister(b.value, b.timestamp, b.nodeId));
            }
        }
        // Merge tombstones
        const allTombKeys = new Set([...this._tombstones.keys(), ...other._tombstones.keys()]);
        for (const k of allTombKeys) {
            const tsA = this._tombstones.get(k) ?? 0;
            const tsB = other._tombstones.get(k) ?? 0;
            const maxTs = Math.max(tsA, tsB);
            if (maxTs > 0)
                result._tombstones.set(k, maxTs);
        }
        return result;
    }
    toJSON() {
        const registers = {};
        for (const [k, v] of this._registers)
            registers[k] = v.toJSON();
        const tombstones = {};
        for (const [k, v] of this._tombstones)
            tombstones[k] = v;
        return { type: 'lww_map', registers, tombstones };
    }
    static fromJSON(d) {
        const m = new LWWMap();
        for (const [k, v] of Object.entries(d.registers ?? {})) {
            m._registers.set(k, LWWRegister.fromJSON(v));
        }
        for (const [k, v] of Object.entries(d.tombstones ?? {})) {
            m._tombstones.set(k, v);
        }
        return m;
    }
    toString() {
        return `LWWMap(keys=${Object.keys(this.value).length})`;
    }
}
exports.LWWMap = LWWMap;
