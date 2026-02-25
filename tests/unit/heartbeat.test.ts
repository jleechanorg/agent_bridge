import { describe, it, expect, vi } from "vitest";
import { HeartbeatBridge } from "../../src/orchestration/heartbeat.js";

describe("Orchestration — Heartbeat Bridge", () => {
    it("records agent heartbeat", () => {
        const bridge = new HeartbeatBridge();
        bridge.recordHeartbeat("agent-1");
        expect(bridge.isAlive("agent-1")).toBe(true);
    });

    it("detects stale agent after timeout", () => {
        const bridge = new HeartbeatBridge({ staleAfterMs: 100 });
        bridge.recordHeartbeat("agent-1");
        // Simulate time passing by setting last heartbeat in the past
        bridge.setLastHeartbeat("agent-1", Date.now() - 200);
        expect(bridge.isAlive("agent-1")).toBe(false);
    });

    it("lists all known agents", () => {
        const bridge = new HeartbeatBridge();
        bridge.recordHeartbeat("a1");
        bridge.recordHeartbeat("a2");
        bridge.recordHeartbeat("a3");
        expect(bridge.listAgents()).toHaveLength(3);
    });

    it("detects disappeared agents", () => {
        const bridge = new HeartbeatBridge({ staleAfterMs: 100 });
        bridge.recordHeartbeat("a1");
        bridge.recordHeartbeat("a2");
        bridge.setLastHeartbeat("a1", Date.now() - 200);
        const disappeared = bridge.getDisappeared();
        expect(disappeared).toContain("a1");
        expect(disappeared).not.toContain("a2");
    });

    it("removes agent", () => {
        const bridge = new HeartbeatBridge();
        bridge.recordHeartbeat("a1");
        bridge.removeAgent("a1");
        expect(bridge.listAgents()).toHaveLength(0);
    });

    it("returns agent uptime", () => {
        const bridge = new HeartbeatBridge();
        bridge.recordHeartbeat("a1");
        const uptime = bridge.getUptime("a1");
        expect(uptime).toBeGreaterThanOrEqual(0);
        expect(uptime).toBeLessThan(1000);
    });
});
