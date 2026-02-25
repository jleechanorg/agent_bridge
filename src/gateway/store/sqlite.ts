/**
 * SQLite-backed session store — persistent sessions that survive restarts.
 */

import Database from "better-sqlite3";
import crypto from "node:crypto";

export interface SessionMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}

export interface Session {
    id: string;
    senderId?: string;
    channel?: string;
    status: "active" | "closed";
    messages: SessionMessage[];
    createdAt: number;
    updatedAt: number;
}

export class SqliteSessionStore {
    private db: Database.Database;

    constructor(dbPath: string) {
        this.db = new Database(dbPath);
        this.db.pragma("journal_mode = WAL");
        this.db.pragma("foreign_keys = ON");
        this._migrate();
    }

    private _migrate(): void {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        sender_id TEXT,
        channel TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_sender ON sessions(sender_id, status);
      CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    `);
    }

    private _generateId(): string {
        const now = new Date();
        const ts = now.toISOString().replace(/[:.]/g, "-").slice(0, 23);
        const rand = crypto.randomBytes(4).toString("hex");
        return `session-${ts}-${rand}`;
    }

    create(opts: { senderId?: string; channel?: string }): Session {
        const id = this._generateId();
        const now = Date.now();

        this.db.prepare(`
      INSERT INTO sessions (id, sender_id, channel, status, created_at, updated_at)
      VALUES (?, ?, ?, 'active', ?, ?)
    `).run(id, opts.senderId ?? null, opts.channel ?? null, now, now);

        return {
            id,
            senderId: opts.senderId,
            channel: opts.channel,
            status: "active",
            messages: [],
            createdAt: now,
            updatedAt: now,
        };
    }

    get(id: string): Session | undefined {
        const row = this.db.prepare(`
      SELECT id, sender_id, channel, status, created_at, updated_at
      FROM sessions WHERE id = ?
    `).get(id) as any;

        if (!row) return undefined;

        const messages = this.db.prepare(`
      SELECT role, content, timestamp FROM messages
      WHERE session_id = ? ORDER BY id ASC
    `).all(id) as SessionMessage[];

        return {
            id: row.id,
            senderId: row.sender_id ?? undefined,
            channel: row.channel ?? undefined,
            status: row.status,
            messages,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    findBySender(senderId: string): Session | undefined {
        const row = this.db.prepare(`
      SELECT id FROM sessions WHERE sender_id = ? AND status = 'active'
      ORDER BY updated_at DESC LIMIT 1
    `).get(senderId) as any;

        if (!row) return undefined;
        return this.get(row.id);
    }

    getOrCreate(opts: { senderId?: string; channel?: string }): Session {
        if (opts.senderId) {
            const existing = this.findBySender(opts.senderId);
            if (existing) return existing;
        }
        return this.create(opts);
    }

    addMessage(sessionId: string, msg: SessionMessage): void {
        this.db.prepare(`
      INSERT INTO messages (session_id, role, content, timestamp)
      VALUES (?, ?, ?, ?)
    `).run(sessionId, msg.role, msg.content, msg.timestamp);

        this.db.prepare(`
      UPDATE sessions SET updated_at = ? WHERE id = ?
    `).run(Date.now(), sessionId);
    }

    list(): Session[] {
        const rows = this.db.prepare(`
      SELECT id FROM sessions ORDER BY updated_at DESC
    `).all() as any[];

        return rows.map((r) => this.get(r.id)!);
    }

    /** Close/complete a session by ID */
    closeSession(id: string): boolean {
        const result = this.db.prepare(`
      UPDATE sessions SET status = 'closed', updated_at = ? WHERE id = ?
    `).run(Date.now(), id);

        return result.changes > 0;
    }

    /** Alias for backward compatibility */
    close(id: string): boolean {
        return this.closeSession(id);
    }

    count(): number {
        const row = this.db.prepare("SELECT COUNT(*) as c FROM sessions").get() as any;
        return row.c;
    }

    activeCount(): number {
        const row = this.db.prepare("SELECT COUNT(*) as c FROM sessions WHERE status = 'active'").get() as any;
        return row.c;
    }

    /** Test helper: manually set updatedAt for TTL testing */
    _setUpdatedAt(id: string, ts: number): void {
        this.db.prepare("UPDATE sessions SET updated_at = ? WHERE id = ?").run(ts, id);
    }

    /** Clean up sessions not updated within ttlMs */
    cleanExpired(ttlMs: number): number {
        const cutoff = Date.now() - ttlMs;
        const result = this.db.prepare("DELETE FROM sessions WHERE updated_at < ?").run(cutoff);
        return result.changes;
    }

    /** Close the database connection */
    dispose(): void {
        this.db.close();
    }
}
