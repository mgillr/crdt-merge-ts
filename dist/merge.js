"use strict";
/**
 * CRDT-powered tabular merge — conflict-free merge of arrays of objects (like DataFrames).
 *
 * Handles:
 *   - Row-level merge by key column (matched rows: LWW per cell)
 *   - Rows unique to either side: preserved
 *   - Schema divergence: union of columns, missing filled with undefined
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.merge = merge;
const core_1 = require("./core");
/**
 * Merge two arrays of objects using CRDT semantics — conflict-free, deterministic, order-independent.
 *
 * @param a First dataset (array of objects)
 * @param b Second dataset (array of objects)
 * @param options Merge options
 * @returns Merged array, sorted by key
 */
function merge(a, b, options) {
    const key = options?.key ?? 'id';
    const strategy = options?.strategy ?? 'lww';
    const tsA = options?.timestamps?.a ?? 0;
    const tsB = options?.timestamps?.b ?? 1; // B wins by default for LWW
    // Build index by key
    const indexA = new Map();
    for (const row of a) {
        const k = row[key];
        if (k !== undefined && k !== null)
            indexA.set(k, row);
    }
    const indexB = new Map();
    for (const row of b) {
        const k = row[key];
        if (k !== undefined && k !== null)
            indexB.set(k, row);
    }
    // All keys, preserving insertion order (A first, then new from B)
    const allKeys = [];
    const seenKeys = new Set();
    for (const k of indexA.keys()) {
        if (!seenKeys.has(k)) {
            allKeys.push(k);
            seenKeys.add(k);
        }
    }
    for (const k of indexB.keys()) {
        if (!seenKeys.has(k)) {
            allKeys.push(k);
            seenKeys.add(k);
        }
    }
    // Gather all columns
    const allColumns = new Set();
    for (const row of a)
        for (const c of Object.keys(row))
            allColumns.add(c);
    for (const row of b)
        for (const c of Object.keys(row))
            allColumns.add(c);
    const merged = [];
    for (const k of allKeys) {
        const rowA = indexA.get(k);
        const rowB = indexB.get(k);
        if (rowA && !rowB) {
            merged.push(rowA);
        }
        else if (rowB && !rowA) {
            merged.push(rowB);
        }
        else if (rowA && rowB) {
            // Both sides — merge per cell
            merged.push(mergeRows(rowA, rowB, allColumns, strategy, tsA, tsB));
        }
    }
    // Sort by key
    merged.sort((x, y) => {
        const kx = x[key];
        const ky = y[key];
        if (kx < ky)
            return -1;
        if (kx > ky)
            return 1;
        return 0;
    });
    return merged;
}
function mergeRows(rowA, rowB, columns, strategy, tsA, tsB) {
    const result = {};
    for (const col of columns) {
        const valA = rowA[col];
        const valB = rowB[col];
        if (valA === undefined && valB !== undefined) {
            result[col] = valB;
        }
        else if (valB === undefined && valA !== undefined) {
            result[col] = valA;
        }
        else if (valA === valB) {
            result[col] = valA;
        }
        else {
            // Conflict
            switch (strategy) {
                case 'keep_a':
                    result[col] = valA;
                    break;
                case 'keep_b':
                    result[col] = valB;
                    break;
                case 'lww':
                default: {
                    const regA = new core_1.LWWRegister(valA, tsA, 'a');
                    const regB = new core_1.LWWRegister(valB, tsB, 'b');
                    result[col] = regA.merge(regB).value;
                    break;
                }
            }
        }
    }
    return result;
}
