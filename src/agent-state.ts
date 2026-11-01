// SPDX-License-Identifier: Apache-2.0

/**
 * AgentState: a CRDT container for one agent's facts, tags, counters and messages.
 *
 * Wraps an LWWMap (facts), an ORSet (tags) and PNCounters, and reads and writes the same wire
 * form as the reference implementation.
 */

import { LWWMap, ORSet, PNCounter } from './core';
import type { LWWMapJSON, ORSetJSON, PNCounterJSON } from './core';

export interface FactJSON {
  value: any;
  confidence: number;
  source_agent: string;
  timestamp: number;
}

/** A single fact with confidence and provenance. */
export class Fact {
  constructor(
    public value: any,
    public confidence = 1.0,
    public sourceAgent = '',
    public timestamp: number = Date.now() / 1000,
  ) {}

  toJSON(): FactJSON {
    return {
      value: this.value,
      confidence: this.confidence,
      source_agent: this.sourceAgent,
      timestamp: this.timestamp,
    };
  }

  static fromJSON(d: FactJSON): Fact {
    return new Fact(d.value, d.confidence ?? 1.0, d.source_agent ?? '', d.timestamp ?? 0);
  }
}

export interface AgentMessage {
  content: string;
  role: string;
  agent_id: string;
  timestamp: number;
  metadata: Record<string, any>;
  [extra: string]: any;
}

export interface AgentStateJSON {
  type: 'agent_state';
  agent_id: string;
  facts: LWWMapJSON;
  tags: ORSetJSON;
  counters: Record<string, PNCounterJSON>;
  messages: AgentMessage[];
  created_at: number;
}

export interface AgentStateOptions {
  /** Keep only the newest this many messages (default 10000). */
  maxMessages?: number;
  /** 'content_agent_time' (default) or 'content_only'. */
  dedupStrategy?: string;
  /** Creation time in seconds since the epoch (default: now). */
  createdAt?: number;
}

export class AgentState {
  readonly agentId: string;
  private _facts = new LWWMap();
  private _tags = new ORSet<string>();
  private _counters = new Map<string, PNCounter>();
  private _messages: AgentMessage[] = [];
  private _maxMessages: number;
  private _dedupStrategy: string;
  private _createdAt: number;

  constructor(agentId = '', options: AgentStateOptions = {}) {
    this.agentId = agentId;
    this._maxMessages = options.maxMessages ?? 10000;
    this._dedupStrategy = options.dedupStrategy ?? 'content_agent_time';
    this._createdAt = options.createdAt ?? Date.now() / 1000;
  }

  // -- facts ----------------------------------------------------------------

  addFact(key: string, value: any, confidence = 1.0, timestamp?: number): void {
    const ts = timestamp ?? Date.now() / 1000;
    const fact = new Fact(value, confidence, this.agentId, ts);
    this._facts.set(key, fact.toJSON(), ts, this.agentId);
  }

  getFact(key: string): Fact | null {
    const raw = this._facts.get(key);
    return raw === null || raw === undefined ? null : Fact.fromJSON(raw);
  }

  listFacts(): Record<string, Fact> {
    const out: Record<string, Fact> = {};
    for (const [k, v] of Object.entries(this._facts.value)) out[k] = Fact.fromJSON(v);
    return out;
  }

  // -- tags -----------------------------------------------------------------

  addTag(tag: string): void {
    this._tags.add(tag);
  }

  removeTag(tag: string): void {
    this._tags.remove(tag);
  }

  hasTag(tag: string): boolean {
    return this._tags.contains(tag);
  }

  get tags(): Set<string> {
    return this._tags.value;
  }

  // -- counters -------------------------------------------------------------

  private counter(name: string): PNCounter {
    let c = this._counters.get(name);
    if (c === undefined) {
      c = new PNCounter();
      this._counters.set(name, c);
    }
    return c;
  }

  increment(name: string, amount = 1): void {
    this.counter(name).increment(this.agentId, amount);
  }

  decrement(name: string, amount = 1): void {
    this.counter(name).decrement(this.agentId, amount);
  }

  counterValue(name: string): number {
    return this._counters.get(name)?.value ?? 0;
  }

  counterNames(): string[] {
    return [...this._counters.keys()];
  }

  // -- messages -------------------------------------------------------------

  appendMessage(message: string, role = 'agent', metadata: Record<string, any> = {}, timestamp?: number): void {
    this._messages.push({
      content: message,
      role,
      agent_id: this.agentId,
      timestamp: timestamp ?? Date.now() / 1000,
      metadata,
    });
    this.trim();
  }

  get messages(): AgentMessage[] {
    return this._messages.map((m) => ({ ...m }));
  }

  private trim(): void {
    if (this._messages.length > this._maxMessages) {
      this._messages = this._messages.slice(this._messages.length - this._maxMessages);
    }
  }

  // -- merge and wire form ----------------------------------------------------

  /**
   * Merge into a new AgentState: facts by LWWMap, tags by ORSet, counters per name, messages by
   * union on the deduplication key sorted by time. The agent id is the sorted union joined by
   * '+', and created_at is the earlier time. Neither input changes.
   */
  merge(other: AgentState): AgentState {
    const ids = [...new Set([this.agentId, other.agentId])].sort();
    const result = new AgentState(ids.join('+'), {
      maxMessages: Math.max(this._maxMessages, other._maxMessages),
      dedupStrategy: this._dedupStrategy,
      createdAt: Math.min(this._createdAt, other._createdAt),
    });
    result._facts = this._facts.merge(other._facts);
    result._tags = this._tags.merge(other._tags);
    for (const name of new Set([...this._counters.keys(), ...other._counters.keys()])) {
      const c1 = this._counters.get(name) ?? new PNCounter();
      const c2 = other._counters.get(name) ?? new PNCounter();
      result._counters.set(name, c1.merge(c2));
    }
    const seen = new Set<string>();
    const merged: AgentMessage[] = [];
    for (const msg of [...this._messages, ...other._messages]) {
      const key =
        this._dedupStrategy === 'content_only'
          ? msg.content
          : `${msg.content}:${msg.agent_id}:${msg.timestamp ?? ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(msg);
      }
    }
    merged.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    result._messages = merged.map((m) => ({ ...m }));
    result.trim();
    return result;
  }

  toJSON(): AgentStateJSON {
    const counters: Record<string, PNCounterJSON> = {};
    for (const [k, v] of this._counters) counters[k] = v.toJSON();
    return {
      type: 'agent_state',
      agent_id: this.agentId,
      facts: this._facts.toJSON(),
      tags: this._tags.toJSON(),
      counters,
      messages: JSON.parse(JSON.stringify(this._messages)),
      created_at: this._createdAt,
    };
  }

  static fromJSON(d: AgentStateJSON): AgentState {
    const s = new AgentState(d.agent_id ?? '', { createdAt: d.created_at ?? 0 });
    s._facts = LWWMap.fromJSON(d.facts ?? { type: 'lww_map', registers: {}, tombstones: {} });
    s._tags = ORSet.fromJSON<string>(d.tags ?? { type: 'or_set', elements: {} });
    for (const [k, v] of Object.entries(d.counters ?? {})) s._counters.set(k, PNCounter.fromJSON(v));
    s._messages = JSON.parse(JSON.stringify(d.messages ?? []));
    s.trim();
    return s;
  }

  toString(): string {
    return (
      `AgentState(id=${JSON.stringify(this.agentId)}, facts=${Object.keys(this._facts.value).length}, ` +
      `tags=${this.tags.size}, counters=${this._counters.size}, messages=${this._messages.length})`
    );
  }
}
