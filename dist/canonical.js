"use strict";
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalize = canonicalize;
exports.emitCanonical = emitCanonical;
/**
 * The canonical wire form shared by all editions:
 *   - UTF-8 JSON, object keys sorted by code point, two-space indent, a trailing newline;
 *   - the tag lists of every or_set (`elements` values and `tombstones`) sorted;
 *   - numbers that print the same in Python, JavaScript and Rust: whole numbers are integers,
 *     and no float is whole or needs an exponent.
 */
function compareCodePoints(a, b) {
    const x = Array.from(a, (c) => c.codePointAt(0));
    const y = Array.from(b, (c) => c.codePointAt(0));
    const n = Math.min(x.length, y.length);
    for (let i = 0; i < n; i++)
        if (x[i] !== y[i])
            return x[i] - y[i];
    return x.length - y.length;
}
/** Copy a wire value, sorting the tag lists of every or_set it contains. */
function canonicalize(node) {
    if (Array.isArray(node))
        return node.map((v) => canonicalize(v));
    if (node !== null && typeof node === 'object') {
        const src = node;
        const out = {};
        for (const [k, v] of Object.entries(src))
            out[k] = canonicalize(v);
        if (src.type === 'or_set') {
            for (const [k, tags] of Object.entries(src.elements ?? {}))
                out.elements[k] = [...tags].sort();
            if (src.tombstones)
                out.tombstones = [...src.tombstones].sort();
        }
        return out;
    }
    return node;
}
function emit(node, indent) {
    const next = indent + '  ';
    if (node === null || typeof node !== 'object')
        return JSON.stringify(node);
    if (Array.isArray(node)) {
        if (node.length === 0)
            return '[]';
        return '[\n' + node.map((v) => next + emit(v, next)).join(',\n') + '\n' + indent + ']';
    }
    const keys = Object.keys(node).sort(compareCodePoints);
    if (keys.length === 0)
        return '{}';
    return '{\n' + keys.map((k) => next + JSON.stringify(k) + ': ' + emit(node[k], next)).join(',\n') + '\n' + indent + '}';
}
/** Write a wire value in the canonical layout, with a trailing newline. */
function emitCanonical(node) {
    return emit(node, '') + '\n';
}
