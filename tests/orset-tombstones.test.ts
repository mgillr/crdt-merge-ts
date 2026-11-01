import { ORSet, LWWMap } from '../src/core';
import { canonicalize } from '../src/canonical';

describe('ORSet tombstones', () => {
  test('remove records the observed tags as tombstones', () => {
    const s = new ORSet<string>();
    const t1 = s.add('x');
    const t2 = s.add('x');
    s.remove('x');
    expect(s.contains('x')).toBe(false);
    expect(s.toJSON().tombstones).toEqual([t1, t2].sort());
  });

  test('toJSON has no tombstones key until something was removed', () => {
    const s = new ORSet<string>();
    s.add('x');
    expect('tombstones' in s.toJSON()).toBe(false);
  });

  test('removing an absent element changes nothing', () => {
    const s = new ORSet<string>();
    s.remove('nope');
    expect(s.toJSON()).toEqual({ type: 'or_set', elements: {} });
  });

  test('a stale replica cannot resurrect a removed element', () => {
    const a = new ORSet<string>();
    a.add('x');
    const stale = ORSet.fromJSON(a.toJSON());
    a.remove('x');
    expect(a.merge(stale).contains('x')).toBe(false);
    expect(stale.merge(a).contains('x')).toBe(false);
  });

  test('a concurrent add survives a remove that never saw it', () => {
    const a = new ORSet<string>();
    a.add('x');
    const b = ORSet.fromJSON(a.toJSON());
    a.remove('x');
    b.add('x');
    expect(a.merge(b).contains('x')).toBe(true);
    expect(b.merge(a).contains('x')).toBe(true);
  });

  test('merge unions the tombstones and drops tombstoned tags', () => {
    const a = ORSet.fromJSON({ type: 'or_set', elements: { x: ['t1', 't2'] }, tombstones: ['t0'] });
    const b = ORSet.fromJSON({ type: 'or_set', elements: { x: ['t1'] }, tombstones: ['t2'] });
    expect(a.merge(b).toJSON()).toEqual({ type: 'or_set', elements: { x: ['t1'] }, tombstones: ['t0', 't2'] });
  });

  test('fromJSON accepts a dict written without tombstones', () => {
    const s = ORSet.fromJSON({ type: 'or_set', elements: { x: ['t1'] } });
    expect(s.contains('x')).toBe(true);
  });

  test('fromJSON removes tombstoned tags from the live set', () => {
    const s = ORSet.fromJSON({ type: 'or_set', elements: { x: ['t1'] }, tombstones: ['t1'] });
    expect(s.contains('x')).toBe(false);
  });

  test('removeTag removes one tag and keeps the element while another remains', () => {
    const s = new ORSet<string>();
    const t1 = s.add('x');
    s.add('x');
    s.removeTag('x', t1);
    expect(s.contains('x')).toBe(true);
    expect(s.toJSON().tombstones).toEqual([t1]);
    expect(() => s.removeTag('missing', 't')).toThrow();
  });

  test('toJSON lists tags and tombstones in sorted order', () => {
    const s = ORSet.fromJSON({ type: 'or_set', elements: { x: ['c', 'a', 'b'] }, tombstones: ['z', 'y'] });
    expect(s.toJSON().elements.x).toEqual(['a', 'b', 'c']);
    expect(s.toJSON().tombstones).toEqual(['y', 'z']);
  });
});

describe('ORSet element types', () => {
  test('an integer element records its type and is restored as a number', () => {
    const s = new ORSet<number | string>();
    s.add(7);
    const json = s.toJSON();
    expect(json.element_types).toEqual({ '7': 'int' });
    const back = ORSet.fromJSON(json as any);
    expect(back.contains(7)).toBe(true);
    expect(back.contains('7')).toBe(false);
  });

  test('a fractional element is a float', () => {
    const s = new ORSet<number | string>();
    s.add(1.5);
    expect(s.toJSON().element_types).toEqual({ '1.5': 'float' });
    expect(ORSet.fromJSON(s.toJSON() as any).contains(1.5)).toBe(true);
  });

  test('a boolean element uses the reference spelling', () => {
    const s = new ORSet<boolean | string>();
    s.add(true);
    const json = s.toJSON();
    expect(Object.keys(json.elements)).toEqual(['True']);
    expect(json.element_types).toEqual({ True: 'bool' });
    expect(ORSet.fromJSON(json as any).contains(true)).toBe(true);
  });

  test('a string element has no element_types entry', () => {
    const s = new ORSet<string>();
    s.add('x');
    expect('element_types' in s.toJSON()).toBe(false);
  });
});

describe('LWWMap liveness matches the reference', () => {
  test('get and value agree when a register is newer than a merged tombstone', () => {
    const a = new LWWMap();
    a.set('k', 'new', 5, 'n1');
    const b = new LWWMap();
    b.delete('k', 3);
    const merged = a.merge(b);
    expect(merged.value).toEqual({ k: 'new' });
    expect(merged.get('k')).toBe('new');
  });

  test('a tombstone as new as the register hides it in get and value', () => {
    const m = LWWMap.fromJSON({
      type: 'lww_map',
      registers: { k: { type: 'lww_register', value: 1, timestamp: 5, node_id: 'n' } },
      tombstones: { k: 5 },
    });
    expect(m.get('k')).toBeNull();
    expect(m.value).toEqual({});
  });

  test('merge keeps a tombstone with timestamp zero', () => {
    const a = new LWWMap();
    a.delete('k', 0);
    expect(a.merge(new LWWMap()).toJSON().tombstones).toEqual({ k: 0 });
  });

  test('equal timestamps are settled by the higher node id, in either order', () => {
    const a = new LWWMap();
    a.set('k', 'from-n1', 4, 'n1');
    const b = new LWWMap();
    b.set('k', 'from-n2', 4, 'n2');
    expect(a.merge(b).get('k')).toBe('from-n2');
    expect(b.merge(a).get('k')).toBe('from-n2');
  });
});

describe('canonical form', () => {
  test('canonicalize sorts the tag lists of every or_set, also nested', () => {
    const out = canonicalize({
      tags: { type: 'or_set', elements: { x: ['b', 'a'] }, tombstones: ['d', 'c'] },
      other: ['z', 'y'],
    });
    expect(out.tags.elements.x).toEqual(['a', 'b']);
    expect(out.tags.tombstones).toEqual(['c', 'd']);
    expect(out.other).toEqual(['z', 'y']);
  });
});
