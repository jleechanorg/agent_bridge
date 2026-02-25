import { describe, it, expect, vi } from "vitest";
import {
    WebhookBridge,
    type OrchEvent,
} from "../../src/orchestration/webhook-bridge.js";

describe("Orchestration — Webhook Bridge", () => {
    it("emits agent_started event", () => {
        const sent: OrchEvent[] = [];
        const bridge = new WebhookBridge({ onEvent: (e) => sent.push(e) });
        bridge.emit("agent_started", { agentName: "claude-1", cli: "claude", task: "fix bug" });
        expect(sent).toHaveLength(1);
        expect(sent[0].event).toBe("agent_started");
        expect(sent[0].payload.agentName).toBe("claude-1");
    });

    it("emits agent_failed event", () => {
        const sent: OrchEvent[] = [];
        const bridge = new WebhookBridge({ onEvent: (e) => sent.push(e) });
        bridge.emit("agent_failed", { agentName: "claude-1", exitCode: 1, lastOutput: "error" });
        expect(sent[0].event).toBe("agent_failed");
    });

    it("emits task_complete event", () => {
        const sent: OrchEvent[] = [];
        const bridge = new WebhookBridge({ onEvent: (e) => sent.push(e) });
        bridge.emit("task_complete", { agentName: "claude-1", prUrl: "https://github.com/org/repo/pull/1" });
        expect(sent[0].payload.prUrl).toBeDefined();
    });

    it("emits agent_killed event", () => {
        const sent: OrchEvent[] = [];
        const bridge = new WebhookBridge({ onEvent: (e) => sent.push(e) });
        bridge.emit("agent_killed", { agentName: "claude-1", reason: "timeout" });
        expect(sent[0].payload.reason).toBe("timeout");
    });

    it("includes timestamp on all events", () => {
        const sent: OrchEvent[] = [];
        const bridge = new WebhookBridge({ onEvent: (e) => sent.push(e) });
        bridge.emit("agent_started", { agentName: "a1" });
        expect(sent[0].timestamp).toBeDefined();
    });

    it("builds webhook payload for HTTP POST", () => {
        const bridge = new WebhookBridge({ url: "http://localhost:3000/webhooks" });
        const payload = bridge.buildPayload("agent_started", { agentName: "a1", cli: "claude" });
        expect(payload.body).toContain("agent_started");
        expect(payload.url).toBe("http://localhost:3000/webhooks");
        expect(payload.headers["Content-Type"]).toBe("application/json");
    });

    it("silently ignores errors (fire-and-forget)", () => {
        const bridge = new WebhookBridge({
            onEvent: () => { throw new Error("webhook down"); },
        });
        // Should not throw
        bridge.emit("agent_started", { agentName: "a1" });
    });
});
