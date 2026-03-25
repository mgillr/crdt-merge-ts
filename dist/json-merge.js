"use strict";
/**
 * Deep conflict-free JSON/object merge using CRDT semantics.
 *
 * Handles nested objects, arrays, and mixed types. Each leaf is treated as an
 * LWW Register — if both sides set a value, the one with the later timestamp
 * (or side B by default) wins.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeDicts = mergeDicts;
/**
 * Create a hashable key for a list item (for dedup in array merging).
 */
function listItemKey(item) {
    if (item === null || item === undefined)
        return String(item);
    if (typeof item === 'object' && !Array.isArray(item)) {
        return JSON.stringify(Object.keys(item)
            .sort()
            .map(k => [k, String(item[k])]));
    }
    if (Array.isArray(item)) {
        return JSON.stringify(item.map(i => String(i)));
    }
    return String(item);
}
/**
 * Merge two arrays: concatenate and deduplicate by value while preserving order.
 */
function mergeLists(a, b) {
    const seen = new Set();
    const result = [];
    for (const item of [...a, ...b]) {
        const key = listItemKey(item);
        if (!seen.has(key)) {
            seen.add(key);
            result.push(item);
        }
    }
    return result;
}
/**
 * Deep clone a value.
 */
function deepClone(val) {
    if (val === null || val === undefined || typeof val !== 'object')
        return val;
    return JSON.parse(JSON.stringify(val));
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
function mergeDicts(a, b, options) {
    const strategy = options?.strategy ?? 'deep';
    const tsA = options?.timestamps?.a ?? 0;
    const tsB = options?.timestamps?.b ?? 1; // B wins by default
    // Short-circuit strategies
    if (strategy === 'keep_a')
        return deepClone(a);
    if (strategy === 'keep_b')
        return deepClone(b);
    return mergeDeep(a, b, strategy, tsA, tsB);
}
function mergeDeep(a, b, strategy, tsA, tsB) {
    const result = {};
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of allKeys) {
        const valA = a[key];
        const valB = b[key];
        if (!(key in a)) {
            result[key] = deepClone(valB);
        }
        else if (!(key in b)) {
            result[key] = deepClone(valA);
        }
        else if (typeof valA === 'object' && valA !== null && !Array.isArray(valA) &&
            typeof valB === 'object' && valB !== null && !Array.isArray(valB)) {
            // Both are plain objects — recurse
            result[key] = mergeDeep(valA, valB, strategy, tsA, tsB);
        }
        else if (Array.isArray(valA) && Array.isArray(valB)) {
            // Both are arrays — union
            result[key] = mergeLists(valA, valB);
        }
        else if (deepEquals(valA, valB)) {
            result[key] = deepClone(valA);
        }
        else {
            // Conflict — resolve
            if (strategy === 'lww') {
                result[key] = tsB >= tsA ? deepClone(valB) : deepClone(valA);
            }
            else {
                // 'deep' strategy: B wins for scalar conflicts (like Python version)
                result[key] = deepClone(valB);
            }
        }
    }
    return result;
}
function deepEquals(a, b) {
    if (a === b)
        return true;
    if (a === null || b === null)
        return false;
    if (typeof a !== typeof b)
        return false;
    if (typeof a !== 'object')
        return false;
    if (Array.isArray(a) !== Array.isArray(b))
        return false;
    if (Array.isArray(a)) {
        if (a.length !== b.length)
            return false;
        return a.every((v, i) => deepEquals(v, b[i]));
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length)
        return false;
    return keysA.every(k => deepEquals(a[k], b[k]));
}
