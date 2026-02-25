import { describe, it, expect, vi } from "vitest";
import { RouteResolver, type RouteRule } from "../../src/routing/resolver.js";
import { SessionKeyBuilder } from "../../src/routing/session-key.js";

describe("Routing", () => {
    describe("RouteResolver", () => {
        it("matches by channel", () => {
            const resolver = new RouteResolver();
            resolver.addRule({ channel: "slack", agentId: "claude-1" });
            expect(resolver.resolve({ channel: "slack", senderId: "u1" })?.agentId).toBe("claude-1");
        });

        it("matches by sender pattern", () => {
            const resolver = new RouteResolver();
            resolver.addRule({ senderPattern: /^admin/, agentId: "admin-agent" });
            expect(resolver.resolve({ channel: "any", senderId: "admin-alice" })?.agentId).toBe("admin-agent");
        });

        it("matches by keyword", () => {
            const resolver = new RouteResolver();
            resolver.addRule({ keyword: "urgent", agentId: "fast-agent" });
            expect(resolver.resolve({ channel: "any", senderId: "u1", text: "this is urgent" })?.agentId).toBe("fast-agent");
        });

        it("returns null for no match", () => {
            const resolver = new RouteResolver();
            resolver.addRule({ channel: "slack", agentId: "a1" });
            expect(resolver.resolve({ channel: "discord", senderId: "u1" })).toBeNull();
        });

        it("first match wins", () => {
            const resolver = new RouteResolver();
            resolver.addRule({ channel: "slack", agentId: "first" });
            resolver.addRule({ channel: "slack", agentId: "second" });
            expect(resolver.resolve({ channel: "slack", senderId: "u1" })?.agentId).toBe("first");
        });
    });

    describe("SessionKeyBuilder", () => {
        it("builds canonical key", () => {
            const key = SessionKeyBuilder.build({ agentId: "a1", channel: "slack", senderId: "u1" });
            expect(key).toBe("a1:slack:u1");
        });

        it("parses canonical key", () => {
            const parts = SessionKeyBuilder.parse("a1:slack:u1");
            expect(parts).toEqual({ agentId: "a1", channel: "slack", senderId: "u1" });
        });

        it("handles missing channel", () => {
            const key = SessionKeyBuilder.build({ agentId: "a1", senderId: "u1" });
            expect(key).toBe("a1:_:u1");
        });
    });
});
