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
export interface GCounterJSON {
    type: 'g_counter';
    counts: Record<string, number>;
}
/**
 * Grow-only counter. Each node has its own slot; value = sum of all slots.
 *
 * Perfect for: page views, download counts, event counters — anything that only goes up.
 */
export declare class GCounter {
    private _counts;
    constructor(nodeId?: string, initial?: number);
    /** Current value (sum of all node counts). */
    get value(): number;
    /** Increment the counter for a given node. */
    increment(nodeId: string, amount?: number): void;
    /** Merge with another GCounter — returns a new merged GCounter. */
    merge(other: GCounter): GCounter;
    toJSON(): GCounterJSON;
    static fromJSON(d: GCounterJSON): GCounter;
    toString(): string;
}
export interface PNCounterJSON {
    type: 'pn_counter';
    pos: GCounterJSON;
    neg: GCounterJSON;
}
/**
 * Positive-Negative counter — supports both increment and decrement.
 *
 * Internally two G-Counters: one for increments, one for decrements.
 * Perfect for: stock levels, balance tracking, bidirectional counters.
 */
export declare class PNCounter {
    private _pos;
    private _neg;
    constructor();
    /** Current value (increments minus decrements). */
    get value(): number;
    increment(nodeId: string, amount?: number): void;
    decrement(nodeId: string, amount?: number): void;
    merge(other: PNCounter): PNCounter;
    toJSON(): PNCounterJSON;
    static fromJSON(d: PNCounterJSON): PNCounter;
    toString(): string;
}
export interface LWWRegisterJSON {
    type: 'lww_register';
    value: any;
    timestamp: number;
    node_id: string;
}
/**
 * Last-Writer-Wins Register — stores a single value, latest timestamp wins.
 *
 * Perfect for: single-cell updates (name, email, status), any scalar field.
 */
export declare class LWWRegister<T = any> {
    private _value;
    private _timestamp;
    private _nodeId;
    constructor(value?: T | null, timestamp?: number, nodeId?: string);
    get value(): T | null;
    get timestamp(): number;
    get nodeId(): string;
    set(value: T, timestamp?: number, nodeId?: string): void;
    merge(other: LWWRegister<T>): LWWRegister<T>;
    toJSON(): LWWRegisterJSON;
    static fromJSON<T = any>(d: LWWRegisterJSON): LWWRegister<T>;
    toString(): string;
}
export interface ORSetJSON {
    type: 'or_set';
    elements: Record<string, string[]>;
}
/**
 * Observed-Remove Set — add and remove elements without conflicts.
 *
 * Each element is tagged with a unique ID on add. Remove kills specific tags,
 * so concurrent add+remove of the same element resolves correctly (add wins
 * over concurrent remove — the "add-wins" semantics).
 *
 * Perfect for: membership lists, tag sets, deduplication sets.
 */
export declare class ORSet<T extends string | number = string> {
    private _elements;
    constructor();
    /** Current set of live elements. */
    get value(): Set<T>;
    /** Add an element, returning its unique tag. */
    add(element: T): string;
    /** Remove an element (clears all known tags). */
    remove(element: T): void;
    /** Check if element is in the set. */
    contains(element: T): boolean;
    /** Merge with another ORSet — union of all tags per element. */
    merge(other: ORSet<T>): ORSet<T>;
    toJSON(): ORSetJSON;
    static fromJSON<T extends string | number = string>(d: ORSetJSON): ORSet<T>;
    toString(): string;
}
export interface LWWMapJSON {
    type: 'lww_map';
    registers: Record<string, LWWRegisterJSON>;
    tombstones: Record<string, number>;
}
/**
 * Last-Writer-Wins Map — a dictionary where each key is an LWW Register.
 *
 * Concurrent writes to different keys: both preserved.
 * Concurrent writes to same key: latest timestamp wins.
 *
 * Perfect for: row-level merges, metadata dicts, config objects.
 */
export declare class LWWMap {
    private _registers;
    private _tombstones;
    constructor();
    set(key: string, value: any, timestamp?: number, nodeId?: string): void;
    get(key: string, defaultValue?: any): any;
    delete(key: string, timestamp?: number): void;
    get value(): Record<string, any>;
    merge(other: LWWMap): LWWMap;
    toJSON(): LWWMapJSON;
    static fromJSON(d: LWWMapJSON): LWWMap;
    toString(): string;
}
