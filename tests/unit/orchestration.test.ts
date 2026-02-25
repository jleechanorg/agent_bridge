import { describe, it, expect, vi } from "vitest";
import { AgentRegistry, type AgentEntry } from "../../src/orchestration/registry.js";
import { SessionKeyResolver } from "../../src/orchestration/session-keys.js";
import { WakeSleepController } from "../../src/orchestration/wake-sleep.js";

describe("Advanced Orchestration", () => {
    // ─── Agent Registry ─────────────────────────

    describe("AgentRegistry", () => {
        it("should register agents", () => {
            const reg = new AgentRegistry();
            reg.register({ id: "a1", cli: "claude", workspace: "/w1" });
            reg.register({ id: "a2", cli: "gemini", workspace: "/w2" });
            expect(reg.list()).toHaveLength(2);
        });

        it("should find agent by ID", () => {
            const reg = new AgentRegistry();
            reg.register({ id: "a1", cli: "claude", workspace: "/w1" });
            expect(reg.get("a1")?.cli).toBe("claude");
        });

        it("should remove agents", () => {
            const reg = new AgentRegistry();
            reg.register({ id: "a1", cli: "claude", workspace: "/w1" });
            reg.remove("a1");
            expect(reg.get("a1")).toBeUndefined();
        });

        it("should route by channel", () => {
            const reg = new AgentRegistry();
            reg.register({ id: "a1", cli: "claude", workspace: "/w1", channels: ["slack"] });
            reg.register({ id: "a2", cli: "gemini", workspace: "/w2", channels: ["discord"] });

            expect(reg.findByChannel("slack")?.id).toBe("a1");
            expect(reg.findByChannel("discord")?.id).toBe("a2");
            expect(reg.findByChannel("telegram")).toBeUndefined();
        });
    });

    // ─── Session Keys ──────────────────────────

    describe("SessionKeyResolver", () => {
        it("should generate canonical key", () => {
            const resolver = new SessionKeyResolver();
            const key = resolver.resolve({ agentId: "a1", senderId: "u1" });
            expect(key).toBe("a1:u1");
        });

        it("should create aliases", () => {
            const resolver = new SessionKeyResolver();
            resolver.setAlias("my-chat", "a1:u1");
            expect(resolver.resolveAlias("my-chat")).toBe("a1:u1");
        });

        it("should return undefined for unknown alias", () => {
            const resolver = new SessionKeyResolver();
            expect(resolver.resolveAlias("unknown")).toBeUndefined();
        });
    });

    // ─── Wake/Sleep ────────────────────────────

    describe("WakeSleepController", () => {
        it("should start in sleep state", () => {
            const ctrl = new WakeSleepController({ idleTimeoutMs: 5000 });
            expect(ctrl.isAwake()).toBe(false);
        });

        it("should wake on event", () => {
            const ctrl = new WakeSleepController({ idleTimeoutMs: 5000 });
            ctrl.wake();
            expect(ctrl.isAwake()).toBe(true);
        });

        it("should track last activity", () => {
            const ctrl = new WakeSleepController({ idleTimeoutMs: 5000 });
            ctrl.wake();
            ctrl.recordActivity();
            expect(ctrl.lastActivity()).toBeGreaterThan(0);
        });

        it("should detect idle state", () => {
            const ctrl = new WakeSleepController({ idleTimeoutMs: 100 });
            ctrl.wake();
            ctrl.recordActivity();
            // Manually backdate
            ctrl._setLastActivity(Date.now() - 200);
            expect(ctrl.isIdle()).toBe(true);
        });

        it("should sleep after idle", () => {
            const ctrl = new WakeSleepController({ idleTimeoutMs: 100 });
            ctrl.wake();
            ctrl._setLastActivity(Date.now() - 200);
            ctrl.checkAndSleep();
            expect(ctrl.isAwake()).toBe(false);
        });
    });
});
