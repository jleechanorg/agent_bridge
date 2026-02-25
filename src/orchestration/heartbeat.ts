/**
 * Heartbeat bridge — agent liveness detection.
 * From ORCHESTRATION_DESIGN.md Phase 2.
 */

export class HeartbeatBridge {
    private agents: Map<string, { lastHeartbeat: number; firstSeen: number }> = new Map();
    private staleAfterMs: number;

    constructor(opts: { staleAfterMs?: number } = {}) {
        this.staleAfterMs = opts.staleAfterMs ?? 120_000; // 2 minutes default
    }

    recordHeartbeat(agentId: string): void {
        const existing = this.agents.get(agentId);
        this.agents.set(agentId, {
            lastHeartbeat: Date.now(),
            firstSeen: existing?.firstSeen ?? Date.now(),
        });
    }

    setLastHeartbeat(agentId: string, timestamp: number): void {
        const existing = this.agents.get(agentId);
        if (existing) existing.lastHeartbeat = timestamp;
    }

    isAlive(agentId: string): boolean {
        const entry = this.agents.get(agentId);
        if (!entry) return false;
        return (Date.now() - entry.lastHeartbeat) < this.staleAfterMs;
    }

    listAgents(): string[] {
        return [...this.agents.keys()];
    }

    getDisappeared(): string[] {
        return this.listAgents().filter((id) => !this.isAlive(id));
    }

    removeAgent(agentId: string): void {
        this.agents.delete(agentId);
    }

    getUptime(agentId: string): number {
        const entry = this.agents.get(agentId);
        if (!entry) return 0;
        return Date.now() - entry.firstSeen;
    }
}
