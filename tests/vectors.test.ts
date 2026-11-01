import * as fs from 'fs';
import * as path from 'path';
import * as core from '../src/core';

// Protocol vectors written by the reference implementation (see tests/vectors/SOURCE).
// For every vector this edition reads the wire form, re-emits it, and must produce the same
// bytes as the file. The canonical form: UTF-8 JSON, keys sorted, two-space indent, trailing
// newline, or_set tag lists sorted.

const DIR = path.join(__dirname, 'vectors');
const TYPES = ['orset', 'lwwmap', 'agentstate'] as const;

// Sorted-key JSON in the canonical layout. Keys are ordered by code point, as the reference does.
function emit(node: any, indent = ''): string {
  const next = indent + '  ';
  if (node === null || typeof node !== 'object') return JSON.stringify(node);
  if (Array.isArray(node)) {
    if (node.length === 0) return '[]';
    return '[\n' + node.map((v) => next + emit(v, next)).join(',\n') + '\n' + indent + ']';
  }
  const keys = Object.keys(node).sort((a, b) => {
    const x = Array.from(a).map((c) => c.codePointAt(0)!);
    const y = Array.from(b).map((c) => c.codePointAt(0)!);
    for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i];
    return x.length - y.length;
  });
  if (keys.length === 0) return '{}';
  return '{\n' + keys.map((k) => next + JSON.stringify(k) + ': ' + emit(node[k], next)).join(',\n') + '\n' + indent + '}';
}

// Sort the tag lists of every or_set, as the canonical form requires.
function canonical(node: any): any {
  if (Array.isArray(node)) return node.map(canonical);
  if (node && typeof node === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(node)) out[k] = canonical(v);
    if (node.type === 'or_set') {
      for (const [k, tags] of Object.entries<any>(node.elements ?? {})) out.elements[k] = [...tags].sort();
      if (node.tombstones) out.tombstones = [...node.tombstones].sort();
    }
    return out;
  }
  return node;
}

// Read a wire state with this edition's type and write it back out.
function reEmit(wire: any): any {
  switch (wire.type) {
    case 'or_set':
      return core.ORSet.fromJSON(wire).toJSON();
    case 'lww_map':
      return core.LWWMap.fromJSON(wire).toJSON();
    case 'agent_state': {
      const AgentState = (core as any).AgentState;
      if (!AgentState) throw new Error('this edition has no AgentState');
      return AgentState.fromJSON(wire).toJSON();
    }
    default:
      throw new Error(`unknown wire type ${wire.type}`);
  }
}

const docs: Record<string, any> = {};
const raw: Record<string, string> = {};
for (const t of TYPES) {
  raw[t] = fs.readFileSync(path.join(DIR, `${t}.json`), 'utf8');
  docs[t] = JSON.parse(raw[t]);
}

describe('protocol vectors', () => {
  for (const t of TYPES) {
    describe(t, () => {
      test('the file is in canonical form', () => {
        expect(emit(docs[t]) + '\n').toBe(raw[t]);
      });

      for (const v of docs[t].vectors) {
        test(`state ${v.name} is re-emitted byte-identically`, () => {
          const again = emit(canonical(reEmit(JSON.parse(JSON.stringify(v.state)))));
          expect(again).toBe(emit(v.state));
        });
      }

      for (const m of docs[t].merges) {
        for (const side of ['a', 'b', 'result']) {
          test(`merge ${m.name}: ${side} is re-emitted byte-identically`, () => {
            const again = emit(canonical(reEmit(JSON.parse(JSON.stringify(m[side])))));
            expect(again).toBe(emit(m[side]));
          });
        }
      }

      test('the whole file is re-emitted byte-identically', () => {
        const doc = JSON.parse(raw[t]);
        for (const v of doc.vectors) v.state = canonical(reEmit(v.state));
        for (const m of doc.merges) for (const side of ['a', 'b', 'result']) m[side] = canonical(reEmit(m[side]));
        expect(emit(doc) + '\n').toBe(raw[t]);
      });
    });
  }
});
