import { dedup, jaccardSimilarity } from '../src/dedup';

describe('dedup', () => {
  // ─── Exact matching ──────────────────────────────────────────────────────

  test('exact duplicates removed (strings)', () => {
    const items = ['hello', 'world', 'hello', 'world'];
    const result = dedup(items);
    expect(result.unique).toEqual(['hello', 'world']);
    expect(result.duplicates).toHaveLength(2);
  });

  test('no duplicates returns all', () => {
    const items = ['a', 'b', 'c'];
    const result = dedup(items);
    expect(result.unique).toEqual(['a', 'b', 'c']);
    expect(result.duplicates).toHaveLength(0);
  });

  test('empty array returns empty', () => {
    const result = dedup([]);
    expect(result.unique).toEqual([]);
    expect(result.duplicates).toHaveLength(0);
  });

  test('case insensitive by default', () => {
    const items = ['Hello World', 'hello world', 'HELLO WORLD'];
    const result = dedup(items);
    expect(result.unique).toHaveLength(1);
    expect(result.unique[0]).toBe('Hello World');
  });

  test('case sensitive when specified', () => {
    const items = ['Hello', 'hello'];
    const result = dedup(items, { caseSensitive: true, threshold: 1.0 });
    expect(result.unique).toHaveLength(2);
  });

  test('whitespace normalization', () => {
    const items = ['hello  world', 'hello world'];
    const result = dedup(items);
    expect(result.unique).toHaveLength(1);
  });

  // ─── Fuzzy matching ─────────────────────────────────────────────────────

  test('fuzzy dedup: similar strings matched', () => {
    const items = ['machine learning', 'machine learnng', 'deep learning'];
    const result = dedup(items, { threshold: 0.7 });
    // 'machine learning' and 'machine learnng' should be similar
    expect(result.unique.length).toBeLessThan(3);
  });

  test('threshold = 1.0 means exact match only', () => {
    const items = ['abc', 'abd'];
    const result = dedup(items, { threshold: 1.0 });
    expect(result.unique).toHaveLength(2);
  });

  test('threshold = 0 means everything matches', () => {
    const items = ['completely different', 'xyzzy asdf'];
    const result = dedup(items, { threshold: 0 });
    expect(result.unique).toHaveLength(1);
  });

  test('duplicate info contains matched item and similarity', () => {
    const items = ['hello world', 'Hello World'];
    const result = dedup(items);
    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0].matchedWith).toBe('hello world');
    expect(result.duplicates[0].similarity).toBe(1.0);
  });

  // ─── Object dedup ──────────────────────────────────────────────────────

  test('object dedup by key field', () => {
    const items = [
      { name: 'Alice', age: 25 },
      { name: 'alice', age: 30 },
      { name: 'Bob', age: 35 },
    ];
    const result = dedup(items, { key: 'name' });
    expect(result.unique).toHaveLength(2); // 'Alice' and 'Bob'
  });

  test('object dedup with custom key function', () => {
    const items = [
      { first: 'John', last: 'Doe' },
      { first: 'john', last: 'doe' },
      { first: 'Jane', last: 'Doe' },
    ];
    const result = dedup(items, { key: (item) => `${item.first} ${item.last}` });
    expect(result.unique).toHaveLength(2);
  });

  test('object dedup without key compares all fields', () => {
    const items = [
      { a: 'hello', b: 'world' },
      { a: 'hello', b: 'world' },
    ];
    const result = dedup(items);
    expect(result.unique).toHaveLength(1);
  });
});

describe('jaccardSimilarity', () => {
  test('identical strings = 1.0', () => {
    expect(jaccardSimilarity('hello', 'hello')).toBe(1.0);
  });

  test('completely different strings ≈ 0', () => {
    const sim = jaccardSimilarity('abcdef', 'xyzwvu');
    expect(sim).toBeLessThan(0.1);
  });

  test('similar strings have high similarity', () => {
    const sim = jaccardSimilarity('machine learning', 'machine learnng');
    expect(sim).toBeGreaterThan(0.7);
  });

  test('empty strings return 0', () => {
    expect(jaccardSimilarity('', '')).toBe(0);
  });
});
