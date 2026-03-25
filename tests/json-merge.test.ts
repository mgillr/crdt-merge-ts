import { mergeDicts } from '../src/json-merge';

describe('mergeDicts', () => {
  test('disjoint keys are preserved', () => {
    const a = { x: 1 };
    const b = { y: 2 };
    const result = mergeDicts(a, b);
    expect(result).toEqual({ x: 1, y: 2 });
  });

  test('same key, same value: no conflict', () => {
    const a = { x: 1 };
    const b = { x: 1 };
    expect(mergeDicts(a, b)).toEqual({ x: 1 });
  });

  test('conflicting scalar: B wins by default (deep strategy)', () => {
    const a = { name: 'Alice' };
    const b = { name: 'Alicia' };
    expect(mergeDicts(a, b).name).toBe('Alicia');
  });

  test('nested objects are recursively merged', () => {
    const a = { model: { name: 'bert', layers: 12 } };
    const b = { model: { name: 'bert-large', dropout: 0.1 } };
    const result = mergeDicts(a, b);
    expect(result.model.layers).toBe(12);
    expect(result.model.dropout).toBe(0.1);
    expect(result.model.name).toBe('bert-large'); // B wins
  });

  test('arrays are unioned', () => {
    const a = { tags: ['nlp', 'ml'] };
    const b = { tags: ['ml', 'qa'] };
    const result = mergeDicts(a, b);
    expect(result.tags).toEqual(['nlp', 'ml', 'qa']);
  });

  test('array dedup preserves order', () => {
    const a = { items: [1, 2, 3] };
    const b = { items: [3, 4, 5] };
    expect(mergeDicts(a, b).items).toEqual([1, 2, 3, 4, 5]);
  });

  test('deep nested merge', () => {
    const a = { a: { b: { c: 1, d: 2 } } };
    const b = { a: { b: { c: 1, e: 3 } } };
    const result = mergeDicts(a, b);
    expect(result.a.b).toEqual({ c: 1, d: 2, e: 3 });
  });

  test('strategy: keep_a', () => {
    const a = { name: 'Alice', age: 25 };
    const b = { name: 'Bob', city: 'NYC' };
    const result = mergeDicts(a, b, { strategy: 'keep_a' });
    expect(result).toEqual({ name: 'Alice', age: 25 });
  });

  test('strategy: keep_b', () => {
    const a = { name: 'Alice', age: 25 };
    const b = { name: 'Bob', city: 'NYC' };
    const result = mergeDicts(a, b, { strategy: 'keep_b' });
    expect(result).toEqual({ name: 'Bob', city: 'NYC' });
  });

  test('strategy: lww with timestamps (A wins)', () => {
    const a = { name: 'Alice' };
    const b = { name: 'Bob' };
    const result = mergeDicts(a, b, { strategy: 'lww', timestamps: { a: 100, b: 50 } });
    expect(result.name).toBe('Alice');
  });

  test('strategy: lww with timestamps (B wins)', () => {
    const a = { name: 'Alice' };
    const b = { name: 'Bob' };
    const result = mergeDicts(a, b, { strategy: 'lww', timestamps: { a: 50, b: 100 } });
    expect(result.name).toBe('Bob');
  });

  test('mixed types: object in A, scalar in B', () => {
    const a = { x: { nested: true } } as any;
    const b = { x: 'string_value' } as any;
    const result = mergeDicts(a, b);
    expect(result.x).toBe('string_value'); // B wins for type conflicts
  });

  test('arrays of objects deduped', () => {
    const a = { items: [{ id: 1, name: 'a' }] };
    const b = { items: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] };
    const result = mergeDicts(a, b);
    expect(result.items).toHaveLength(2);
  });

  test('null values handled', () => {
    const a = { x: null } as any;
    const b = { x: 'value' } as any;
    const result = mergeDicts(a, b);
    expect(result.x).toBe('value'); // B wins
  });

  test('empty objects merge to empty', () => {
    expect(mergeDicts({}, {})).toEqual({});
  });

  test('complex real-world config merge', () => {
    const configA = {
      model: { name: 'bert', layers: 12 },
      training: { lr: 0.001, epochs: 10 },
      tags: ['nlp'],
    };
    const configB = {
      model: { name: 'bert-large', dropout: 0.1 },
      training: { lr: 0.0001, batch_size: 32 },
      tags: ['qa'],
      version: 2,
    };
    const result = mergeDicts(configA, configB);
    expect(result.model.layers).toBe(12);
    expect(result.model.dropout).toBe(0.1);
    expect(result.model.name).toBe('bert-large');
    expect(result.training.epochs).toBe(10);
    expect(result.training.batch_size).toBe(32);
    expect(result.tags).toEqual(['nlp', 'qa']);
    expect(result.version).toBe(2);
  });
});
