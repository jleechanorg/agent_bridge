import { describe, it, expect, beforeEach } from "vitest";
import { SessionStore } from "../../src/gateway/sessions.js";

describe("SessionStore", () => {
    let store: SessionStore;

    beforeEach(() => {
        store = new SessionStore();
    });

    it("should create a session with generated ID", () => {
        const session = store.create({});
        expect(session.id).toMatch(/^session-/);
        expect(session.status).toBe("active");
        expect(session.messages).toEqual([]);
        expect(session.createdAt).toBeGreaterThan(0);
    });

    it("should create a session with senderId", () => {
        const session = store.create({ senderId: "user-123" });
        expect(session.senderId).toBe("user-123");
    });

    it("should get a session by ID", () => {
        const created = store.create({});
        const retrieved = store.get(created.id);
        expect(retrieved).toEqual(created);
    });

    it("should return undefined for unknown ID", () => {
        expect(store.get("nonexistent")).toBeUndefined();
    });

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

    it("should getOrCreate reuses existing session", () => {
        const first = store.create({ senderId: "user-C" });
        const second = store.getOrCreate({ senderId: "user-C" });
        expect(second.id).toBe(first.id);
    });

    it("should getOrCreate creates new when none exists", () => {
        const session = store.getOrCreate({ senderId: "user-D" });
        expect(session.senderId).toBe("user-D");
        expect(store.count()).toBe(1);
    });

    it("should add messages to a session", () => {
        const session = store.create({});
        store.addMessage(session.id, {
            role: "user",
            content: "hello",
            timestamp: Date.now(),
        });
        store.addMessage(session.id, {
            role: "assistant",
            content: "hi there",
            timestamp: Date.now(),
        });

        const updated = store.get(session.id);
        expect(updated?.messages).toHaveLength(2);
        expect(updated?.messages[0].role).toBe("user");
        expect(updated?.messages[1].role).toBe("assistant");
    });

    it("should list sessions sorted by updatedAt (newest first)", () => {
        const s1 = store.create({ senderId: "1" });
        const s2 = store.create({ senderId: "2" });

        // Touch s1 to make it most recent
        store.addMessage(s1.id, {
            role: "user",
            content: "update",
            timestamp: Date.now(),
        });

        const list = store.list();
        expect(list[0].id).toBe(s1.id);
        expect(list[1].id).toBe(s2.id);
    });

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
});
