<div align="center">

# 🔀 crdt-merge

**Conflict-free merge, dedup & diff for any dataset — powered by CRDTs**

[![npm version](https://img.shields.io/npm/v/crdt-merge.svg)](https://www.npmjs.com/package/crdt-merge)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Tests: 97/97](https://img.shields.io/badge/tests-97%2F97-brightgreen.svg)](https://github.com/mgillr/crdt-merge-ts)

**Merge any two datasets in one function call. No conflicts. No coordination. No data loss.**

[Quick Start](#-quick-start) • [Why CRDTs](#-why-crdts) • [API Reference](#-api-reference) • [All Languages](#-available-in-every-language)

</div>

---

## 🌐 Available in Every Language

| Language | Package | Install | Repo |
|---|---|---|---|
| **Python** 🐍 | `crdt-merge` | `pip install crdt-merge` | [crdt-merge](https://github.com/mgillr/crdt-merge) |
| **TypeScript** | `crdt-merge` | `npm install crdt-merge` | **You are here** |
| **Rust** 🦀 | `crdt-merge` | `cargo add crdt-merge` | [crdt-merge-rs](https://github.com/mgillr/crdt-merge-rs) |
| **Java** ☕ | `io.optitransfer:crdt-merge` | Maven / Gradle | [crdt-merge-java](https://github.com/mgillr/crdt-merge-java) |
| **CLI** 🖥️ | included in Rust | `cargo install crdt-merge` | [crdt-merge-rs](https://github.com/mgillr/crdt-merge-rs) |

> **[🤗 Try it in the browser →](https://huggingface.co/spaces/Optitransfer/crdt-merge)**

---

## 🎯 The Problem

You have two versions of a dataset. Maybe two services updated the same records. Maybe two contributors edited the same file. Maybe you're merging data from multiple sources.

**Today:** Write custom merge scripts, lose data, or block on a coordinator.

**With crdt-merge:** One function call. Zero conflicts. Mathematically guaranteed.

```typescript
import { merge } from 'crdt-merge';

const merged = merge(dataA, dataB, { key: 'id' }); // done.
```

## ⚡ Quick Start

```bash
npm install crdt-merge
```

### Merge Two Datasets

```typescript
import { merge } from 'crdt-merge';

const teamA = [
  { id: 1, name: 'Alice', role: 'engineer' },
  { id: 2, name: 'Bob', role: 'designer' },
];

const teamB = [
  { id: 2, name: 'Robert', role: 'designer' },  // Updated name
  { id: 3, name: 'Charlie', role: 'pm' },        // New member
];

const merged = merge(teamA, teamB, { key: 'id' });
// id=1: Alice (only in A — preserved)
// id=2: Robert (B wins — latest)
// id=3: Charlie (only in B — preserved)
```

### Deduplicate Anything

```typescript
import { dedup } from 'crdt-merge';

const items = ['Hello World', 'hello  world', 'HELLO WORLD', 'Something else'];
const { unique, duplicates } = dedup(items);
// unique = ['Hello World', 'Something else']

// Fuzzy dedup with custom threshold
const { unique: fuzzyUnique } = dedup(items, { threshold: 0.7 });
```

### See What Changed

```typescript
import { diff } from 'crdt-merge';

const changes = diff(oldData, newData, { key: 'id' });
console.log(changes.summary);
// "+5 added, -2 removed, ~3 modified, =990 unchanged"

changes.modified.forEach(m => {
  console.log(`Row ${m.key}:`, m.changes);
});
```

### Deep-Merge JSON/Objects

```typescript
import { mergeDicts } from 'crdt-merge';

const configA = { model: { name: 'bert', layers: 12 }, tags: ['nlp'] };
const configB = { model: { name: 'bert-large', dropout: 0.1 }, tags: ['qa'] };

const merged = mergeDicts(configA, configB);
// { model: { name: 'bert-large', layers: 12, dropout: 0.1 }, tags: ['nlp', 'qa'] }
```

### Use CRDT Types Directly

```typescript
import { GCounter, PNCounter, LWWRegister, ORSet } from 'crdt-merge';

// Distributed counter
const counterA = new GCounter();
counterA.increment('server-1', 100);

const counterB = new GCounter();
counterB.increment('server-2', 200);

const merged = counterA.merge(counterB);
console.log(merged.value); // 300

// Last-writer-wins register
const regA = new LWWRegister('Alice', 1000);
const regB = new LWWRegister('Alicia', 2000);
console.log(regA.merge(regB).value); // 'Alicia' (later timestamp wins)

// Add-wins set
const setA = new ORSet<string>();
setA.add('item1');
const setB = new ORSet<string>();
setB.add('item2');
console.log(setA.merge(setB).value); // Set { 'item1', 'item2' }
```

## 🧠 Why CRDTs

**CRDT** = Conflict-free Replicated Data Type. A data structure with one mathematical superpower:

> **Any two copies can merge — in any order, at any time — and the result is always identical and always correct.**

Three mathematical guarantees (proven, not hoped):

| Property | What it means |
|---|---|
| **Commutative** | `merge(A, B) == merge(B, A)` — order doesn't matter |
| **Associative** | `merge(merge(A, B), C) == merge(A, merge(B, C))` — grouping doesn't matter |
| **Idempotent** | `merge(A, A) == A` — re-merging is safe |

This means: **zero coordination, zero locks, zero conflicts.**

### Built-in CRDT Types

| Type | Use Case | Example |
|---|---|---|
| `GCounter` | Grow-only counters | Download counts, page views |
| `PNCounter` | Increment + decrement | Stock levels, balances |
| `LWWRegister` | Single value (latest wins) | Name, email, status fields |
| `ORSet` | Add/remove set | Tags, memberships, dedup sets |
| `LWWMap` | Key-value map | Row merges, config objects |

## 📖 API Reference

### `merge<T>(a: T[], b: T[], options?): T[]`

Merge two arrays of objects using CRDT semantics.

- **key** (`string`, default: `"id"`): Primary key field for matching rows.
- **strategy** (`'lww' | 'keep_a' | 'keep_b'`, default: `'lww'`): Conflict resolution strategy.
- **timestamps** (`{ a?: number; b?: number }`): Timestamps for LWW resolution.

### `dedup<T>(items: T[], options?): DedupResult<T>`

Deduplicate an array using exact or fuzzy matching.

- **key** (`string | (item: T) => string`): Field name or custom key extractor.
- **threshold** (`number`, default: `0.85`): Similarity threshold (0–1). Use `1.0` for exact only.
- **caseSensitive** (`boolean`, default: `false`): Whether matching is case-sensitive.

Returns `{ unique: T[], duplicates: Array<{ item, matchedWith, similarity }> }`.

### `diff<T>(a: T[], b: T[], options?): DiffResult<T>`

Compute structural diff between two datasets.

- **key** (`string`, default: `"id"`): Primary key field.

Returns `{ added, removed, modified, unchanged, summary }`.

### `mergeDicts<T>(a: T, b: T, options?): T`

Deep-merge two objects with CRDT semantics.

- **strategy** (`'lww' | 'deep' | 'keep_a' | 'keep_b'`, default: `'deep'`): Merge strategy.
- **timestamps** (`{ a?: number; b?: number }`): Timestamps for LWW resolution.

### CRDT Types

All CRDT types support `merge()`, `value` getter, `toJSON()`, and `static fromJSON()`.

- **`GCounter`**: `increment(nodeId, amount?)`, `value` (sum)
- **`PNCounter`**: `increment(nodeId, amount?)`, `decrement(nodeId, amount?)`, `value` (pos - neg)
- **`LWWRegister<T>`**: `set(value, timestamp?, nodeId?)`, `value`, `timestamp`
- **`ORSet<T>`**: `add(element)`, `remove(element)`, `contains(element)`, `value` (Set)
- **`LWWMap`**: `set(key, value, timestamp?)`, `get(key)`, `delete(key)`, `value` (Record)

## 📊 Benchmarks

See the [Python version benchmarks](https://github.com/mgillr/crdt-merge#-benchmarks) for reference numbers (320K+ rows/sec, 8.6M CRDT ops/sec).

## 📄 License

MIT — use it for anything.

---

<div align="center">

Built with math, not hope. 🧬

**[⭐ Star on GitHub](https://github.com/mgillr/crdt-merge-ts)** • **[🤗 Try on HuggingFace](https://huggingface.co/spaces/Optitransfer/crdt-merge)** • **[📦 npm](https://www.npmjs.com/package/crdt-merge)**

</div>
