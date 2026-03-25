import { GCounter, PNCounter, LWWRegister, ORSet, LWWMap } from '../src/core';

// ─── GCounter ─────────────────────────────────────────────────────────────────

describe('GCounter', () => {
  test('initial value is 0', () => {
    const c = new GCounter();
    expect(c.value).toBe(0);
  });

  test('constructor with initial value', () => {
    const c = new GCounter('node1', 5);
    expect(c.value).toBe(5);
  });

  test('increment increases value', () => {
    const c = new GCounter();
    c.increment('a', 3);
    c.increment('b', 7);
    expect(c.value).toBe(10);
  });

  test('increment same node accumulates', () => {
    const c = new GCounter();
    c.increment('a', 3);
    c.increment('a', 2);
    expect(c.value).toBe(5);
  });

  test('negative increment throws', () => {
    const c = new GCounter();
    expect(() => c.increment('a', -1)).toThrow();
  });

  test('merge commutativity: merge(A,B) == merge(B,A)', () => {
    const a = new GCounter();
    a.increment('x', 3);
    const b = new GCounter();
    b.increment('y', 5);
    expect(a.merge(b).value).toBe(b.merge(a).value);
  });

  test('merge associativity', () => {
    const a = new GCounter(); a.increment('x', 1);
    const b = new GCounter(); b.increment('y', 2);
    const c = new GCounter(); c.increment('z', 3);
    const ab_c = a.merge(b).merge(c);
    const a_bc = a.merge(b.merge(c));
    expect(ab_c.value).toBe(a_bc.value);
  });

  test('merge idempotency: merge(A,A) == A', () => {
    const a = new GCounter();
    a.increment('x', 5);
    a.increment('y', 3);
    expect(a.merge(a).value).toBe(a.value);
  });

  test('merge takes max per node', () => {
    const a = new GCounter(); a.increment('x', 3);
    const b = new GCounter(); b.increment('x', 5);
    expect(a.merge(b).value).toBe(5);
  });

  test('serialization round-trip', () => {
    const c = new GCounter();
    c.increment('a', 10);
    c.increment('b', 20);
    const json = c.toJSON();
    const restored = GCounter.fromJSON(json);
    expect(restored.value).toBe(30);
  });
});

// ─── PNCounter ────────────────────────────────────────────────────────────────

describe('PNCounter', () => {
  test('initial value is 0', () => {
    expect(new PNCounter().value).toBe(0);
  });

  test('increment and decrement', () => {
    const c = new PNCounter();
    c.increment('a', 10);
    c.decrement('a', 3);
    expect(c.value).toBe(7);
  });

  test('value can go negative', () => {
    const c = new PNCounter();
    c.decrement('a', 5);
    expect(c.value).toBe(-5);
  });

  test('merge commutativity', () => {
    const a = new PNCounter(); a.increment('x', 10); a.decrement('x', 3);
    const b = new PNCounter(); b.increment('y', 5);
    expect(a.merge(b).value).toBe(b.merge(a).value);
  });

  test('merge associativity', () => {
    const a = new PNCounter(); a.increment('x', 1);
    const b = new PNCounter(); b.decrement('y', 2);
    const c = new PNCounter(); c.increment('z', 3);
    expect(a.merge(b).merge(c).value).toBe(a.merge(b.merge(c)).value);
  });

  test('merge idempotency', () => {
    const a = new PNCounter(); a.increment('x', 5); a.decrement('y', 2);
    expect(a.merge(a).value).toBe(a.value);
  });

  test('serialization round-trip', () => {
    const c = new PNCounter();
    c.increment('a', 10);
    c.decrement('b', 3);
    const restored = PNCounter.fromJSON(c.toJSON());
    expect(restored.value).toBe(7);
  });
});

// ─── LWWRegister ──────────────────────────────────────────────────────────────

describe('LWWRegister', () => {
  test('initial value is null', () => {
    expect(new LWWRegister().value).toBeNull();
  });

  test('set and get value', () => {
    const r = new LWWRegister<string>();
    r.set('hello', 100);
    expect(r.value).toBe('hello');
    expect(r.timestamp).toBe(100);
  });

  test('merge: higher timestamp wins', () => {
    const a = new LWWRegister('old', 1);
    const b = new LWWRegister('new', 2);
    expect(a.merge(b).value).toBe('new');
  });

  test('merge: lower timestamp loses', () => {
    const a = new LWWRegister('old', 2);
    const b = new LWWRegister('new', 1);
    expect(a.merge(b).value).toBe('old');
  });

  test('merge: tie-break on nodeId', () => {
    const a = new LWWRegister('val_a', 5, 'a');
    const b = new LWWRegister('val_b', 5, 'b');
    expect(a.merge(b).value).toBe('val_b'); // 'b' > 'a'
  });

  test('merge commutativity', () => {
    const a = new LWWRegister('x', 10, 'n1');
    const b = new LWWRegister('y', 20, 'n2');
    expect(a.merge(b).value).toBe(b.merge(a).value);
  });

  test('merge idempotency', () => {
    const a = new LWWRegister('x', 10, 'n1');
    expect(a.merge(a).value).toBe(a.value);
  });

  test('serialization round-trip', () => {
    const r = new LWWRegister('data', 42, 'node1');
    const restored = LWWRegister.fromJSON(r.toJSON());
    expect(restored.value).toBe('data');
    expect(restored.timestamp).toBe(42);
  });
});

// ─── ORSet ────────────────────────────────────────────────────────────────────

describe('ORSet', () => {
  test('initial set is empty', () => {
    expect(new ORSet().value.size).toBe(0);
  });

  test('add and contains', () => {
    const s = new ORSet();
    s.add('a');
    expect(s.contains('a')).toBe(true);
    expect(s.contains('b')).toBe(false);
  });

  test('add returns unique tag', () => {
    const s = new ORSet();
    const tag1 = s.add('a');
    const tag2 = s.add('a');
    expect(tag1).not.toBe(tag2);
  });

  test('remove clears element', () => {
    const s = new ORSet();
    s.add('a');
    s.remove('a');
    expect(s.contains('a')).toBe(false);
  });

  test('add wins over concurrent remove', () => {
    const s1 = new ORSet<string>();
    s1.add('x');

    const s2 = new ORSet<string>();
    s2.add('x');

    // s1 removes x
    s1.remove('x');

    // s2 adds x again (new tag)
    s2.add('x');

    // Merge: s2's new tag survives s1's remove
    const merged = s1.merge(s2);
    expect(merged.contains('x')).toBe(true);
  });

  test('merge commutativity', () => {
    const a = new ORSet<string>(); a.add('x'); a.add('y');
    const b = new ORSet<string>(); b.add('y'); b.add('z');
    const ab = a.merge(b);
    const ba = b.merge(a);
    expect(ab.value).toEqual(ba.value);
  });

  test('merge idempotency', () => {
    const a = new ORSet<string>(); a.add('x'); a.add('y');
    expect(a.merge(a).value).toEqual(a.value);
  });

  test('merge union of elements', () => {
    const a = new ORSet<string>(); a.add('a'); a.add('b');
    const b = new ORSet<string>(); b.add('b'); b.add('c');
    const merged = a.merge(b);
    expect(merged.value).toEqual(new Set(['a', 'b', 'c']));
  });

  test('serialization round-trip', () => {
    const s = new ORSet<string>();
    s.add('x');
    s.add('y');
    const restored = ORSet.fromJSON(s.toJSON());
    expect(restored.contains('x')).toBe(true);
    expect(restored.contains('y')).toBe(true);
  });
});

// ─── LWWMap ──────────────────────────────────────────────────────────────────

describe('LWWMap', () => {
  test('set and get', () => {
    const m = new LWWMap();
    m.set('key', 'value', 1);
    expect(m.get('key')).toBe('value');
  });

  test('get returns default for missing', () => {
    const m = new LWWMap();
    expect(m.get('missing', 'default')).toBe('default');
  });

  test('delete hides key', () => {
    const m = new LWWMap();
    m.set('key', 'value', 1);
    m.delete('key', 2);
    expect(m.get('key')).toBeNull();
  });

  test('set after delete with later timestamp restores key', () => {
    const m = new LWWMap();
    m.set('key', 'v1', 1);
    m.delete('key', 2);
    m.set('key', 'v2', 3);
    expect(m.get('key')).toBe('v2');
  });

  test('merge preserves both keys', () => {
    const a = new LWWMap(); a.set('x', 1, 1);
    const b = new LWWMap(); b.set('y', 2, 1);
    const merged = a.merge(b);
    expect(merged.get('x')).toBe(1);
    expect(merged.get('y')).toBe(2);
  });

  test('merge: latest timestamp wins for same key', () => {
    const a = new LWWMap(); a.set('x', 'old', 1);
    const b = new LWWMap(); b.set('x', 'new', 2);
    expect(a.merge(b).get('x')).toBe('new');
  });

  test('serialization round-trip', () => {
    const m = new LWWMap();
    m.set('a', 1, 10);
    m.set('b', 2, 20);
    const restored = LWWMap.fromJSON(m.toJSON());
    expect(restored.value).toEqual({ a: 1, b: 2 });
  });
});
