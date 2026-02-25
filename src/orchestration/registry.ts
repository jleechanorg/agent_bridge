/**
 * Agent registry — multi-agent routing and management.
 */

export interface AgentEntry {
    id: string;
    cli: string;
    workspace: string;
    channels?: string[];
    model?: string;
}

export class AgentRegistry {
    private agents: Map<string, AgentEntry> = new Map();

    register(entry: AgentEntry): void {
        this.agents.set(entry.id, entry);
    }

    remove(id: string): void {
        this.agents.delete(id);
    }

    get(id: string): AgentEntry | undefined {
        return this.agents.get(id);
    }

    list(): AgentEntry[] {
        return [...this.agents.values()];
    }

    findByChannel(channel: string): AgentEntry | undefined {
        for (const agent of this.agents.values()) {
            if (agent.channels?.includes(channel)) return agent;
        }
        return undefined;
    }

    findByCli(cli: string): AgentEntry[] {
        return [...this.agents.values()].filter((a) => a.cli === cli);
    }
}
