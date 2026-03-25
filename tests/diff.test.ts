import { diff } from '../src/diff';

describe('diff', () => {
  test('no changes: all unchanged', () => {
    const data = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
    const result = diff(data, data, { key: 'id' });
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.modified).toHaveLength(0);
    expect(result.unchanged).toHaveLength(2);
  });

  test('additions detected', () => {
    const a = [{ id: 1, name: 'Alice' }];
    const b = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
    const result = diff(a, b, { key: 'id' });
    expect(result.added).toHaveLength(1);
    expect(result.added[0].name).toBe('Bob');
  });

  test('removals detected', () => {
    const a = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
    const b = [{ id: 1, name: 'Alice' }];
    const result = diff(a, b, { key: 'id' });
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].name).toBe('Bob');
  });

  test('modifications detected', () => {
    const a = [{ id: 1, name: 'Alice', age: 25 }];
    const b = [{ id: 1, name: 'Alicia', age: 25 }];
    const result = diff(a, b, { key: 'id' });
    expect(result.modified).toHaveLength(1);
    expect(result.modified[0].changes).toHaveProperty('name');
    expect(result.modified[0].changes.name.from).toBe('Alice');
    expect(result.modified[0].changes.name.to).toBe('Alicia');
  });

  test('mixed: additions, removals, modifications, unchanged', () => {
    const a = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ];
    const b = [
      { id: 1, name: 'Alice' },     // unchanged
      { id: 2, name: 'Robert' },     // modified
      { id: 4, name: 'Diana' },      // added
    ];
    const result = diff(a, b, { key: 'id' });
    expect(result.unchanged).toHaveLength(1);
    expect(result.modified).toHaveLength(1);
    expect(result.removed).toHaveLength(1);
    expect(result.added).toHaveLength(1);
  });

  test('summary string format', () => {
    const a = [{ id: 1, v: 'a' }];
    const b = [{ id: 1, v: 'b' }, { id: 2, v: 'c' }];
    const result = diff(a, b, { key: 'id' });
    expect(result.summary).toMatch(/\+1 added/);
    expect(result.summary).toMatch(/-0 removed/);
    expect(result.summary).toMatch(/~1 modified/);
    expect(result.summary).toMatch(/=0 unchanged/);
  });

  test('empty arrays', () => {
    const result = diff([], [], { key: 'id' });
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.modified).toHaveLength(0);
    expect(result.unchanged).toHaveLength(0);
  });

  test('default key is "id"', () => {
    const a = [{ id: 1, v: 1 }];
    const b = [{ id: 2, v: 2 }];
    const result = diff(a, b);
    expect(result.added).toHaveLength(1);
    expect(result.removed).toHaveLength(1);
  });

  test('modifications include before and after', () => {
    const a = [{ id: 1, name: 'Alice', city: 'NYC' }];
    const b = [{ id: 1, name: 'Alice', city: 'LA' }];
    const result = diff(a, b, { key: 'id' });
    expect(result.modified[0].before).toEqual(a[0]);
    expect(result.modified[0].after).toEqual(b[0]);
  });

  test('multiple field changes in one row', () => {
    const a = [{ id: 1, name: 'Alice', age: 25, city: 'NYC' }];
    const b = [{ id: 1, name: 'Alicia', age: 26, city: 'NYC' }];
    const result = diff(a, b, { key: 'id' });
    expect(Object.keys(result.modified[0].changes)).toHaveLength(2);
    expect(result.modified[0].changes).toHaveProperty('name');
    expect(result.modified[0].changes).toHaveProperty('age');
  });
});
