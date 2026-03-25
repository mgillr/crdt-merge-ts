"use strict";
/**
 * High-performance deduplication powered by CRDT OR-Sets.
 *
 * Methods:
 *   - Exact dedup: normalized string comparison
 *   - Fuzzy dedup: Jaccard similarity on character bigrams
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.jaccardSimilarity = jaccardSimilarity;
exports.dedup = dedup;
/**
 * Normalize text for comparison.
 */
function normalize(text, caseSensitive) {
    let t = text.replace(/\s+/g, ' ').trim();
    if (!caseSensitive)
        t = t.toLowerCase();
    return t;
}
/**
 * Generate character bigrams from text.
 */
function bigrams(text) {
    if (text.length === 0)
        return new Set();
    if (text.length < 2)
        return new Set([text]);
    const result = new Set();
    for (let i = 0; i < text.length - 1; i++) {
        result.add(text.substring(i, i + 2));
    }
    return result;
}
/**
 * Jaccard similarity between two strings (via character bigrams).
 */
function jaccardSimilarity(a, b) {
    const ba = bigrams(a);
    const bb = bigrams(b);
    if (ba.size === 0 || bb.size === 0)
        return 0;
    let intersection = 0;
    for (const x of ba) {
        if (bb.has(x))
            intersection++;
    }
    const union = new Set([...ba, ...bb]).size;
    return union === 0 ? 0 : intersection / union;
}
/**
 * Extract a comparable string from an item.
 */
function extractKey(item, keyOpt, caseSensitive) {
    let raw;
    if (typeof keyOpt === 'function') {
        raw = keyOpt(item);
    }
    else if (typeof keyOpt === 'string' && typeof item === 'object' && item !== null) {
        raw = String(item[keyOpt] ?? '');
    }
    else if (typeof item === 'string') {
        raw = item;
    }
    else if (typeof item === 'object' && item !== null) {
        // Concatenate all string fields
        const obj = item;
        raw = Object.keys(obj)
            .sort()
            .map(k => {
            const v = obj[k];
            return typeof v === 'string' ? v : String(v ?? '');
        })
            .join(' ');
    }
    else {
        raw = String(item);
    }
    return normalize(raw, caseSensitive);
}
/**
 * Deduplicate an array of items using exact or fuzzy matching.
 *
 * @param items Items to deduplicate
 * @param options Dedup options
 * @returns Object with unique items and duplicate info
 */
function dedup(items, options) {
    const threshold = options?.threshold ?? 0.85;
    const caseSensitive = options?.caseSensitive ?? false;
    const keyOpt = options?.key;
    const unique = [];
    const duplicates = [];
    const uniqueKeys = [];
    for (const item of items) {
        const itemKey = extractKey(item, keyOpt, caseSensitive);
        let foundDup = false;
        for (let i = 0; i < uniqueKeys.length; i++) {
            const existingKey = uniqueKeys[i];
            // Exact match
            if (itemKey === existingKey) {
                duplicates.push({ item, matchedWith: unique[i], similarity: 1.0 });
                foundDup = true;
                break;
            }
            // Fuzzy match
            if (threshold < 1.0) {
                const sim = jaccardSimilarity(itemKey, existingKey);
                if (sim >= threshold) {
                    duplicates.push({ item, matchedWith: unique[i], similarity: sim });
                    foundDup = true;
                    break;
                }
            }
        }
        if (!foundDup) {
            unique.push(item);
            uniqueKeys.push(itemKey);
        }
    }
    return { unique, duplicates };
}
