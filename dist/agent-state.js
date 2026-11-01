"use strict";
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentState = exports.Fact = void 0;
/**
 * AgentState — a CRDT container for one agent's facts, tags, counters and messages.
 *
 * Wraps an LWWMap (facts), an ORSet (tags) and PNCounters, and reads and writes the same wire
 * form as the reference implementation.
 */
const core_1 = require("./core");
/** A single fact with confidence and provenance. */
class Fact {
    constructor(value, confidence = 1.0, sourceAgent = '', timestamp = Date.now() / 1000) {
        this.value = value;
        this.confidence = confidence;
        this.sourceAgent = sourceAgent;
        this.timestamp = timestamp;
    }
    toJSON() {
        return {
            value: this.value,
            confidence: this.confidence,
            source_agent: this.sourceAgent,
            timestamp: this.timestamp,
        };
    }
    static fromJSON(d) {
        return new Fact(d.value, d.confidence ?? 1.0, d.source_agent ?? '', d.timestamp ?? 0);
    }
}
exports.Fact = Fact;
class AgentState {
    constructor(agentId = '', options = {}) {
        this._facts = new core_1.LWWMap();
        this._tags = new core_1.ORSet();
        this._counters = new Map();
        this._messages = [];
        this.agentId = agentId;
        this._maxMessages = options.maxMessages ?? 10000;
        this._dedupStrategy = options.dedupStrategy ?? 'content_agent_time';
        this._createdAt = options.createdAt ?? Date.now() / 1000;
    }
    // -- facts ----------------------------------------------------------------
    addFact(key, value, confidence = 1.0, timestamp) {
        const ts = timestamp ?? Date.now() / 1000;
        const fact = new Fact(value, confidence, this.agentId, ts);
        this._facts.set(key, fact.toJSON(), ts, this.agentId);
    }
    getFact(key) {
        const raw = this._facts.get(key);
        return raw === null || raw === undefined ? null : Fact.fromJSON(raw);
    }
    listFacts() {
        const out = {};
        for (const [k, v] of Object.entries(this._facts.value))
            out[k] = Fact.fromJSON(v);
        return out;
    }
    // -- tags -----------------------------------------------------------------
    addTag(tag) {
        this._tags.add(tag);
    }
    removeTag(tag) {
        this._tags.remove(tag);
    }
    hasTag(tag) {
        return this._tags.contains(tag);
    }
    get tags() {
        return this._tags.value;
    }
    // -- counters -------------------------------------------------------------
    counter(name) {
        let c = this._counters.get(name);
        if (c === undefined) {
            c = new core_1.PNCounter();
            this._counters.set(name, c);
        }
        return c;
    }
    increment(name, amount = 1) {
        this.counter(name).increment(this.agentId, amount);
    }
    decrement(name, amount = 1) {
        this.counter(name).decrement(this.agentId, amount);
    }
    counterValue(name) {
        return this._counters.get(name)?.value ?? 0;
    }
    counterNames() {
        return [...this._counters.keys()];
    }
    // -- messages -------------------------------------------------------------
    appendMessage(message, role = 'agent', metadata = {}, timestamp) {
        this._messages.push({
            content: message,
            role,
            agent_id: this.agentId,
            timestamp: timestamp ?? Date.now() / 1000,
            metadata,
        });
        this.trim();
    }
    get messages() {
        return this._messages.map((m) => ({ ...m }));
    }
    trim() {
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
    merge(other) {
        const ids = [...new Set([this.agentId, other.agentId])].sort();
        const result = new AgentState(ids.join('+'), {
            maxMessages: Math.max(this._maxMessages, other._maxMessages),
            dedupStrategy: this._dedupStrategy,
            createdAt: Math.min(this._createdAt, other._createdAt),
        });
        result._facts = this._facts.merge(other._facts);
        result._tags = this._tags.merge(other._tags);
        for (const name of new Set([...this._counters.keys(), ...other._counters.keys()])) {
            const c1 = this._counters.get(name) ?? new core_1.PNCounter();
            const c2 = other._counters.get(name) ?? new core_1.PNCounter();
            result._counters.set(name, c1.merge(c2));
        }
        const seen = new Set();
        const merged = [];
        for (const msg of [...this._messages, ...other._messages]) {
            const key = this._dedupStrategy === 'content_only'
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
    toJSON() {
        const counters = {};
        for (const [k, v] of this._counters)
            counters[k] = v.toJSON();
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
    static fromJSON(d) {
        const s = new AgentState(d.agent_id ?? '', { createdAt: d.created_at ?? 0 });
        s._facts = core_1.LWWMap.fromJSON(d.facts ?? { type: 'lww_map', registers: {}, tombstones: {} });
        s._tags = core_1.ORSet.fromJSON(d.tags ?? { type: 'or_set', elements: {} });
        for (const [k, v] of Object.entries(d.counters ?? {}))
            s._counters.set(k, core_1.PNCounter.fromJSON(v));
        s._messages = JSON.parse(JSON.stringify(d.messages ?? []));
        s.trim();
        return s;
    }
    toString() {
        return (`AgentState(id=${JSON.stringify(this.agentId)}, facts=${Object.keys(this._facts.value).length}, ` +
            `tags=${this.tags.size}, counters=${this._counters.size}, messages=${this._messages.length})`);
    }
}
exports.AgentState = AgentState;
