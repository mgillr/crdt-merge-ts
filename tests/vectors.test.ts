import * as fs from 'fs';
import * as path from 'path';
import { ORSet, LWWMap } from '../src/core';
import { AgentState } from '../src/agent-state';
import { canonicalize, emitCanonical } from '../src/canonical';

// Protocol vectors written by the reference implementation (see tests/vectors/SOURCE).
// For every vector this edition reads the wire form, re-emits it, and must produce the same
// bytes as the file. The canonical form: UTF-8 JSON, keys sorted, two-space indent, trailing
// newline, or_set tag lists sorted. Merge vectors are also merged here and compared.

const DIR = path.join(__dirname, 'vectors');
const TYPES = ['orset', 'lwwmap', 'agentstate'] as const;
type Kind = (typeof TYPES)[number];

const CLASSES: Record<Kind, any> = { orset: ORSet, lwwmap: LWWMap, agentstate: AgentState };

const load = (kind: Kind, wire: any) => CLASSES[kind].fromJSON(JSON.parse(JSON.stringify(wire)));
const reEmit = (kind: Kind, wire: any) => canonicalize(load(kind, wire).toJSON());

function observable(kind: Kind, state: any): any {
  if (kind === 'orset') return [...state.value].map(String).sort();
  if (kind === 'lwwmap') return state.value;
  const facts: Record<string, any> = {};
  for (const [k, f] of Object.entries<any>(state.listFacts())) facts[k] = f.toJSON();
  return {
    facts,
    tags: [...state.tags].sort(),
    counters: Object.fromEntries(state.counterNames().map((n: string) => [n, state.counterValue(n)])),
    messages: state.messages.length,
  };
}

const raw: Record<string, string> = {};
const docs: Record<string, any> = {};
for (const t of TYPES) {
  raw[t] = fs.readFileSync(path.join(DIR, `${t}.json`), 'utf8');
  docs[t] = JSON.parse(raw[t]);
}

describe('protocol vectors', () => {
  for (const t of TYPES) {
    describe(t, () => {
      test('the file is in canonical form', () => {
        expect(emitCanonical(docs[t])).toBe(raw[t]);
      });

      for (const v of docs[t].vectors) {
        test(`state ${v.name} is re-emitted byte-identically`, () => {
          expect(emitCanonical(reEmit(t, v.state))).toBe(emitCanonical(v.state));
        });
        test(`state ${v.name} has the recorded observable value`, () => {
          expect(emitCanonical(observable(t, load(t, v.state)))).toBe(emitCanonical(v.value));
        });
      }

      for (const m of docs[t].merges) {
        for (const side of ['a', 'b', 'result']) {
          test(`merge ${m.name}: ${side} is re-emitted byte-identically`, () => {
            expect(emitCanonical(reEmit(t, m[side]))).toBe(emitCanonical(m[side]));
          });
        }
        test(`merge ${m.name}: a merged with b gives the recorded result, in either order`, () => {
          const a = load(t, m.a);
          const b = load(t, m.b);
          expect(emitCanonical(canonicalize(a.merge(b).toJSON()))).toBe(emitCanonical(m.result));
          expect(emitCanonical(canonicalize(b.merge(a).toJSON()))).toBe(emitCanonical(m.result));
        });
      }

      test('the whole file is re-emitted byte-identically', () => {
        const doc = JSON.parse(raw[t]);
        for (const v of doc.vectors) v.state = reEmit(t, v.state);
        for (const m of doc.merges) for (const side of ['a', 'b', 'result']) m[side] = reEmit(t, m[side]);
        expect(emitCanonical(doc)).toBe(raw[t]);
      });
    });
  }
});
