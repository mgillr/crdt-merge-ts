import { merge } from '../src/merge';

describe('merge', () => {
  test('no overlap: all rows from both sides', () => {
    const a = [{ id: 1, name: 'Alice' }];
    const b = [{ id: 2, name: 'Bob' }];
    const result = merge(a, b, { key: 'id' });
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Alice');
    expect(result[1].name).toBe('Bob');
  });

  test('full overlap: merge conflicts', () => {
    const a = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
    const b = [{ id: 1, name: 'Alicia' }, { id: 2, name: 'Bobby' }];
    const result = merge(a, b, { key: 'id' });
    expect(result).toHaveLength(2);
    // Default LWW: B wins (higher default ts)
    expect(result[0].name).toBe('Alicia');
    expect(result[1].name).toBe('Bobby');
  });

  test('partial overlap', () => {
    const a = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
    const b = [{ id: 2, name: 'Robert' }, { id: 3, name: 'Charlie' }];
    const result = merge(a, b, { key: 'id' });
    expect(result).toHaveLength(3);
    expect(result.find(r => r.id === 1)?.name).toBe('Alice');
    expect(result.find(r => r.id === 2)?.name).toBe('Robert');
    expect(result.find(r => r.id === 3)?.name).toBe('Charlie');
  });

  test('strategy: keep_a', () => {
    const a = [{ id: 1, name: 'Alice' }];
    const b = [{ id: 1, name: 'Alicia' }];
    const result = merge(a, b, { key: 'id', strategy: 'keep_a' });
    expect(result[0].name).toBe('Alice');
  });

  test('strategy: keep_b', () => {
    const a = [{ id: 1, name: 'Alice' }];
    const b = [{ id: 1, name: 'Alicia' }];
    const result = merge(a, b, { key: 'id', strategy: 'keep_b' });
    expect(result[0].name).toBe('Alicia');
  });

  test('strategy: lww with custom timestamps (A wins)', () => {
    const a = [{ id: 1, name: 'Alice' }];
    const b = [{ id: 1, name: 'Alicia' }];
    const result = merge(a, b, { key: 'id', strategy: 'lww', timestamps: { a: 100, b: 50 } });
    expect(result[0].name).toBe('Alice');
  });

  test('strategy: lww with custom timestamps (B wins)', () => {
    const a = [{ id: 1, name: 'Alice' }];
    const b = [{ id: 1, name: 'Alicia' }];
    const result = merge(a, b, { key: 'id', strategy: 'lww', timestamps: { a: 50, b: 100 } });
    expect(result[0].name).toBe('Alicia');
  });

  test('default key is "id"', () => {
    const a = [{ id: 'x', v: 1 }];
    const b = [{ id: 'y', v: 2 }];
    const result = merge(a, b);
    expect(result).toHaveLength(2);
  });

  test('sorted by key', () => {
    const a = [{ id: 3, v: 'c' }, { id: 1, v: 'a' }];
    const b = [{ id: 2, v: 'b' }];
    const result = merge(a, b, { key: 'id' });
    expect(result.map(r => r.id)).toEqual([1, 2, 3]);
  });

  test('schema union: fills missing fields with undefined', () => {
    const a = [{ id: 1, name: 'Alice' }];
    const b = [{ id: 2, name: 'Bob', age: 30 }];
    const result = merge(a, b, { key: 'id' });
    // Both rows should be present
    expect(result).toHaveLength(2);
    const bob = result.find(r => r.id === 2);
    expect(bob?.age).toBe(30);
  });

  test('identical rows merge cleanly', () => {
    const a = [{ id: 1, name: 'Alice', age: 25 }];
    const b = [{ id: 1, name: 'Alice', age: 25 }];
    const result = merge(a, b, { key: 'id' });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: 1, name: 'Alice', age: 25 });
  });

  test('empty arrays', () => {
    expect(merge([], [], { key: 'id' })).toEqual([]);
    expect(merge([{ id: 1 }], [], { key: 'id' })).toEqual([{ id: 1 }]);
    expect(merge([], [{ id: 1 }], { key: 'id' })).toEqual([{ id: 1 }]);
  });

  test('merge with multiple conflicting fields', () => {
    const a = [{ id: 1, name: 'Alice', city: 'NYC' }];
    const b = [{ id: 1, name: 'Alicia', city: 'LA' }];
    const result = merge(a, b, { key: 'id', strategy: 'keep_a' });
    expect(result[0].name).toBe('Alice');
    expect(result[0].city).toBe('NYC');
  });
});
