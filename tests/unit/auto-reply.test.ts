import { describe, it, expect, vi } from "vitest";
import { AutoReplyEngine, defaultTemplates } from "../../src/auto-reply/engine.js";

describe("Auto-Reply Engine", () => {
    it("matches exact pattern", () => {
        const engine = new AutoReplyEngine();
        engine.addRule({ pattern: "hello", response: "Hi there!" });
        expect(engine.match("hello")).toBe("Hi there!");
    });

    it("matches regex pattern", () => {
        const engine = new AutoReplyEngine();
        engine.addRule({ pattern: /^help/i, response: "How can I help?" });
        expect(engine.match("Help me")).toBe("How can I help?");
    });

    it("returns null for no match", () => {
        const engine = new AutoReplyEngine();
        engine.addRule({ pattern: "hello", response: "Hi" });
        expect(engine.match("goodbye")).toBeNull();
    });

    it("substitutes variables", () => {
        const engine = new AutoReplyEngine();
        engine.addRule({ pattern: "status", response: "Hello {{sender}}, the time is {{time}}" });
        const result = engine.match("status", { sender: "Alice", time: "12:00" });
        expect(result).toContain("Alice");
        expect(result).toContain("12:00");
    });

    it("has default templates", () => {
        expect(defaultTemplates.away).toBeDefined();
        expect(defaultTemplates.rateLimit).toBeDefined();
        expect(defaultTemplates.error).toBeDefined();
    });

    it("lists rules", () => {
        const engine = new AutoReplyEngine();
        engine.addRule({ pattern: "a", response: "A" });
        engine.addRule({ pattern: "b", response: "B" });
        expect(engine.listRules()).toHaveLength(2);
    });

    it("removes rules", () => {
        const engine = new AutoReplyEngine();
        engine.addRule({ pattern: "a", response: "A", id: "rule-1" });
        engine.removeRule("rule-1");
        expect(engine.listRules()).toHaveLength(0);
    });
});
