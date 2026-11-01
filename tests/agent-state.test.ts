import { AgentState, Fact } from '../src/agent-state';

describe('AgentState', () => {
  test('a new state is empty and keeps its id', () => {
    const s = new AgentState('a1');
    expect(s.agentId).toBe('a1');
    expect(s.listFacts()).toEqual({});
    expect([...s.tags]).toEqual([]);
    expect(s.messages).toEqual([]);
    expect(s.counterValue('none')).toBe(0);
  });

  test('addFact records value, confidence, source and time', () => {
    const s = new AgentState('a1');
    s.addFact('color', 'blue', 0.75, 10.5);
    const f = s.getFact('color') as Fact;
    expect(f.value).toBe('blue');
    expect(f.confidence).toBe(0.75);
    expect(f.sourceAgent).toBe('a1');
    expect(f.timestamp).toBe(10.5);
    expect(s.getFact('missing')).toBeNull();
  });

  test('addFact on an existing key overwrites it locally, as the reference does', () => {
    const s = new AgentState('a1');
    s.addFact('k', 'first', 1, 20.5);
    s.addFact('k', 'second', 1, 10.5);
    expect((s.getFact('k') as Fact).value).toBe('second');
  });

  test('tags add, remove and report', () => {
    const s = new AgentState('a1');
    s.addTag('urgent');
    expect(s.hasTag('urgent')).toBe(true);
    s.removeTag('urgent');
    expect(s.hasTag('urgent')).toBe(false);
    expect(s.tags.size).toBe(0);
  });

  test('counters go up and down', () => {
    const s = new AgentState('a1');
    s.increment('visits', 3);
    s.decrement('visits');
    expect(s.counterValue('visits')).toBe(2);
    expect(s.counterNames()).toEqual(['visits']);
  });

  test('appendMessage records content, role, agent id, time and metadata', () => {
    const s = new AgentState('a1');
    s.appendMessage('hello', 'agent', { k: 1 }, 20.5);
    expect(s.messages).toEqual([
      { content: 'hello', role: 'agent', agent_id: 'a1', timestamp: 20.5, metadata: { k: 1 } },
    ]);
  });

  test('the message log keeps only the newest maxMessages', () => {
    const s = new AgentState('a1', { maxMessages: 2 });
    s.appendMessage('1', 'agent', {}, 1.5);
    s.appendMessage('2', 'agent', {}, 2.5);
    s.appendMessage('3', 'agent', {}, 3.5);
    expect(s.messages.map((m) => m.content)).toEqual(['2', '3']);
  });

  test('merge takes the sorted union of agent ids and the earlier creation time', () => {
    const a = new AgentState('b', { createdAt: 100.5 });
    const b = new AgentState('a', { createdAt: 50.5 });
    const m = a.merge(b);
    expect(m.agentId).toBe('a+b');
    expect(m.toJSON().created_at).toBe(50.5);
  });

  test('merge leaves both inputs unchanged', () => {
    const a = new AgentState('a');
    a.addFact('k', 1, 1, 1.5);
    const b = new AgentState('b');
    b.addTag('t');
    const before = [JSON.stringify(a.toJSON()), JSON.stringify(b.toJSON())];
    a.merge(b);
    expect([JSON.stringify(a.toJSON()), JSON.stringify(b.toJSON())]).toEqual(before);
  });

  test('merge: a later fact wins in either order', () => {
    const a = new AgentState('a');
    a.addFact('k', 'x', 1, 10.5);
    const b = new AgentState('b');
    b.addFact('k', 'y', 1, 11.5);
    expect((a.merge(b).getFact('k') as Fact).value).toBe('y');
    expect((b.merge(a).getFact('k') as Fact).value).toBe('y');
  });

  test('merge: counters take the larger count per node, so a repeated merge adds nothing', () => {
    const a = new AgentState('a');
    a.increment('n', 3);
    const b = AgentState.fromJSON(a.toJSON());
    b.increment('n', 2);
    const once = a.merge(b);
    expect(once.counterValue('n')).toBe(5);
    expect(once.merge(b).counterValue('n')).toBe(5);
  });

  test('merge: an observed tag removal wins over the tag it saw', () => {
    const a = new AgentState('a');
    a.addTag('t');
    const stale = AgentState.fromJSON(a.toJSON());
    a.removeTag('t');
    expect(a.merge(stale).hasTag('t')).toBe(false);
    expect(stale.merge(a).hasTag('t')).toBe(false);
  });

  test('merge: the same message on both sides appears once, sorted by time', () => {
    const a = new AgentState('a');
    a.appendMessage('hello', 'agent', {}, 20.5);
    const b = new AgentState('b');
    b.appendMessage('reply', 'agent', {}, 22.5);
    const dup = AgentState.fromJSON(a.toJSON());
    const m = b.merge(a).merge(dup);
    expect(m.messages.map((x) => x.content)).toEqual(['hello', 'reply']);
  });

  test('merge with content_only deduplication ignores agent and time', () => {
    const a = new AgentState('a', { dedupStrategy: 'content_only' });
    a.appendMessage('same', 'agent', {}, 1.5);
    const b = new AgentState('b');
    b.appendMessage('same', 'agent', {}, 2.5);
    expect(a.merge(b).messages).toHaveLength(1);
  });

  test('JSON round trip keeps the state', () => {
    const s = new AgentState('a1', { createdAt: 5.5 });
    s.addFact('k', { n: [1, 2] }, 0.5, 10.5);
    s.addTag('t');
    s.increment('c', 2);
    s.appendMessage('hi', 'agent', {}, 3.5);
    const json = JSON.parse(JSON.stringify(s.toJSON()));
    expect(AgentState.fromJSON(json).toJSON()).toEqual(json);
    expect(json.type).toBe('agent_state');
  });
});
