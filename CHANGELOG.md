# Changelog

## 0.3.0 - 2026-11-01

This release makes the TypeScript edition read and write the same wire form as the reference
implementation, so a state written by any edition loads in the others and re-emits byte for
byte. The protocol vectors in `tests/vectors/` check this. They are copied from the reference at
commit `aab0099`.

### Breaking changes

Wire form
- `ORSet.toJSON()` now writes the tags of each element in sorted order. It also writes
  `tombstones` (the removed tags, sorted) once anything has been removed, and `element_types`
  for elements that are not strings.
- `ORSet.fromJSON()` drops any tag that is listed in `tombstones` from the live set.

Behaviour
- `ORSet.remove()` now records the removed tags as tombstones. Merging a stale replica that
  still holds those tags no longer brings the element back. Before, a removed element could
  reappear after a merge.
- `ORSet.merge()` unites the tombstones and drops tombstoned tags from every element.
- `LWWMap.get()` now hides a key only when its tombstone is at least as new as its register, the
  same rule `LWWMap.value` already used. Before, any tombstone hid the key, even after a merge
  made the register newer.
- `LWWMap.merge()` keeps a tombstone whose timestamp is 0.

Types
- The type parameter of `ORSet` now accepts `boolean` as well as `string` and `number`. A boolean
  element is written as `True` or `False` with the type name `bool`.
- `ORSetJSON` has the optional fields `element_types` and `tombstones`.

### Added
- `ORSet.removeTag(element, tag)`.
- `AgentState` and `Fact`: facts, tags, counters and messages with merge, and the shared wire form.
- `canonicalize` and `emitCanonical`: the canonical layout (sorted keys, two-space indent,
  trailing newline, sorted tag lists).

### Changed
- `VERSION` now matches the package version.
- `dist/` is rebuilt from the sources.
- Continuous integration runs `npm ci` and `npm test` on pull requests and on pushes to main.

### Known gaps
- A whole-number float prints as `5.0` in Python and Rust but `5` in JavaScript. The vectors
  avoid such numbers.
- When timestamp and node id are both equal, the reference keeps the left value, so that merge is
  not commutative.
- An unknown `element_types` name is read as a string.
- Keys sort by code point. JavaScript compares UTF-16 units elsewhere, which only differs for
  astral characters.
