import crypto from "node:crypto";
import { createLogger } from "../logger.js";

const log = createLogger("gateway/sessions");

export interface SessionEntry {
    id: string;
    createdAt: number;
    updatedAt: number;
    senderId?: string;
    channel?: string;
    messages: SessionMessage[];
    status: "active" | "idle" | "closed";
}

export interface SessionMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}

/**
 * In-memory session store.
 */
export class SessionStore {
    private sessions = new Map<string, SessionEntry>();

    generateId(): string {
        const now = new Date();
        const ts = now.toISOString().replace(/[:.]/g, "-").replace("T", "_").replace("Z", "");
        const suffix = crypto.randomUUID().slice(0, 8);
        return `session-${ts}-${suffix}`;
    }

    create(opts: { senderId?: string; channel?: string }): SessionEntry {
        const id = this.generateId();
        const now = Date.now();
        const entry: SessionEntry = {
            id,
            createdAt: now,
            updatedAt: now,
            senderId: opts.senderId,
            channel: opts.channel,
            messages: [],
            status: "active",
        };
        this.sessions.set(id, entry);
        log.debug("session created", { id });
        return entry;
    }

    get(id: string): SessionEntry | undefined {
        return this.sessions.get(id);
    }

    findBySender(senderId: string, channel?: string): SessionEntry | undefined {
        for (const session of this.sessions.values()) {
            if (
                session.senderId === senderId &&
                session.status === "active" &&
                (!channel || session.channel === channel)
            ) {
                return session;
            }
        }
        return undefined;
    }

    getOrCreate(opts: { senderId?: string; channel?: string }): SessionEntry {
        if (opts.senderId) {
            const existing = this.findBySender(opts.senderId, opts.channel);
            if (existing) return existing;
        }
        return this.create(opts);
    }

    addMessage(sessionId: string, message: SessionMessage): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        session.messages.push(message);
        session.updatedAt = Date.now();
    }

    list(): SessionEntry[] {
        return Array.from(this.sessions.values()).sort(
            (a, b) => b.updatedAt - a.updatedAt,
        );
    }

    close(id: string): boolean {
        const session = this.sessions.get(id);
        if (!session) return false;
        session.status = "closed";
        session.updatedAt = Date.now();
        return true;
    }

    count(): number {
        return this.sessions.size;
    }

    activeCount(): number {
        let count = 0;
        for (const session of this.sessions.values()) {
            if (session.status === "active") count++;
        }
        return count;
    }
}
