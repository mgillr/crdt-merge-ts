import type { LWWMapJSON, ORSetJSON, PNCounterJSON } from './core';
export interface FactJSON {
    value: any;
    confidence: number;
    source_agent: string;
    timestamp: number;
}
/** A single fact with confidence and provenance. */
export declare class Fact {
    value: any;
    confidence: number;
    sourceAgent: string;
    timestamp: number;
    constructor(value: any, confidence?: number, sourceAgent?: string, timestamp?: number);
    toJSON(): FactJSON;
    static fromJSON(d: FactJSON): Fact;
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
export declare class AgentState {
    readonly agentId: string;
    private _facts;
    private _tags;
    private _counters;
    private _messages;
    private _maxMessages;
    private _dedupStrategy;
    private _createdAt;
    constructor(agentId?: string, options?: AgentStateOptions);
    addFact(key: string, value: any, confidence?: number, timestamp?: number): void;
    getFact(key: string): Fact | null;
    listFacts(): Record<string, Fact>;
    addTag(tag: string): void;
    removeTag(tag: string): void;
    hasTag(tag: string): boolean;
    get tags(): Set<string>;
    private counter;
    increment(name: string, amount?: number): void;
    decrement(name: string, amount?: number): void;
    counterValue(name: string): number;
    counterNames(): string[];
    appendMessage(message: string, role?: string, metadata?: Record<string, any>, timestamp?: number): void;
    get messages(): AgentMessage[];
    private trim;
    /**
     * Merge into a new AgentState: facts by LWWMap, tags by ORSet, counters per name, messages by
     * union on the deduplication key sorted by time. The agent id is the sorted union joined by
     * '+', and created_at is the earlier time. Neither input changes.
     */
    merge(other: AgentState): AgentState;
    toJSON(): AgentStateJSON;
    static fromJSON(d: AgentStateJSON): AgentState;
    toString(): string;
}
