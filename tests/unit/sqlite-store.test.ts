import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SqliteSessionStore } from "../../src/gateway/store/sqlite.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("SqliteSessionStore", () => {
    let store: SqliteSessionStore;
    let dbPath: string;

    beforeEach(() => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ab-sqlite-test-"));
        dbPath = path.join(tmpDir, "test.db");
        store = new SqliteSessionStore(dbPath);
    });

    afterEach(() => {
        store.dispose();
        fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
    });

    // ─── CRUD ──────────────────────────────────────

    it("should create a session with generated ID", () => {
        const session = store.create({});
        expect(session.id).toMatch(/^session-/);
        expect(session.status).toBe("active");
        expect(session.messages).toEqual([]);
        expect(session.createdAt).toBeGreaterThan(0);
    });

    it("should create a session with senderId and channel", () => {
        const session = store.create({ senderId: "user-123", channel: "C001" });
        expect(session.senderId).toBe("user-123");
        expect(session.channel).toBe("C001");
    });

    it("should get a session by ID", () => {
        const created = store.create({ senderId: "user-A" });
        const retrieved = store.get(created.id);
        expect(retrieved).toBeDefined();
        expect(retrieved!.id).toBe(created.id);
        expect(retrieved!.senderId).toBe("user-A");
    });

    it("should return undefined for unknown ID", () => {
        expect(store.get("nonexistent")).toBeUndefined();
    });

    it("should list sessions sorted by updatedAt (newest first)", () => {
        const s1 = store.create({ senderId: "1" });
        const s2 = store.create({ senderId: "2" });
        // Touch s1 to make it most recent
        store.addMessage(s1.id, { role: "user", content: "update", timestamp: Date.now() });

        const list = store.list();
        expect(list[0].id).toBe(s1.id);
        expect(list[1].id).toBe(s2.id);
    });

    // ─── Sender lookup ────────────────────────────

    it("should find session by sender", () => {
        store.create({ senderId: "user-A" });
        const match = store.findBySender("user-A");
        expect(match).toBeDefined();
        expect(match?.senderId).toBe("user-A");
    });

    it("should not find closed sessions by sender", () => {
        const session = store.create({ senderId: "user-B" });
        store.close(session.id);
        const match = store.findBySender("user-B");
        expect(match).toBeUndefined();
    });

    it("should getOrCreate reuse existing session", () => {
        const first = store.create({ senderId: "user-C" });
        const second = store.getOrCreate({ senderId: "user-C" });
        expect(second.id).toBe(first.id);
    });

    it("should getOrCreate create new when none exists", () => {
        const session = store.getOrCreate({ senderId: "user-D" });
        expect(session.senderId).toBe("user-D");
        expect(store.count()).toBe(1);
    });

    // ─── Messages ─────────────────────────────────

    it("should add messages to a session", () => {
        const session = store.create({});
        store.addMessage(session.id, { role: "user", content: "hello", timestamp: Date.now() });
        store.addMessage(session.id, { role: "assistant", content: "hi there", timestamp: Date.now() });

        const updated = store.get(session.id);
        expect(updated?.messages).toHaveLength(2);
        expect(updated!.messages[0].role).toBe("user");
        expect(updated!.messages[1].role).toBe("assistant");
    });

    it("should update updatedAt when adding messages", () => {
        const session = store.create({});
        const before = session.updatedAt;
        // Small delay to ensure different timestamp
        store.addMessage(session.id, { role: "user", content: "update", timestamp: Date.now() });
        const after = store.get(session.id)!.updatedAt;
        expect(after).toBeGreaterThanOrEqual(before);
    });

    // ─── Close / Count ────────────────────────────

    it("should close a session", () => {
        const session = store.create({});
        expect(store.close(session.id)).toBe(true);
        expect(store.get(session.id)?.status).toBe("closed");
    });

    it("should return false when closing nonexistent session", () => {
        expect(store.close("nonexistent")).toBe(false);
    });

    it("should count total and active sessions", () => {
        store.create({});
        store.create({});
        const s3 = store.create({});
        store.close(s3.id);

        expect(store.count()).toBe(3);
        expect(store.activeCount()).toBe(2);
    });

    // ─── Persistence ──────────────────────────────

    it("should persist sessions across reopens", () => {
        const session = store.create({ senderId: "persist-test" });
        store.addMessage(session.id, { role: "user", content: "hello", timestamp: Date.now() });
        store.dispose();

        // Reopen
        const store2 = new SqliteSessionStore(dbPath);
        const reloaded = store2.get(session.id);
        expect(reloaded).toBeDefined();
        expect(reloaded!.senderId).toBe("persist-test");
        expect(reloaded!.messages).toHaveLength(1);
        store2.dispose();
    });

    // ─── TTL Expiry ───────────────────────────────

    it("should clean up sessions older than TTL", () => {
        const old = store.create({ senderId: "old" });
        // Manually backdate: set updatedAt to 2 hours ago
        store._setUpdatedAt(old.id, Date.now() - 2 * 60 * 60 * 1000);

        const recent = store.create({ senderId: "recent" });

        // Clean up sessions older than 1 hour
        const cleaned = store.cleanExpired(60 * 60 * 1000);
        expect(cleaned).toBe(1);
        expect(store.get(old.id)).toBeUndefined();
        expect(store.get(recent.id)).toBeDefined();
    });
});
