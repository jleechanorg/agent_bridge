import { describe, it, expect, vi } from "vitest";
import { LifecycleReactor, type AgentLifecycleState } from "../../src/orchestration/lifecycle-reactor.js";

describe("Orchestration — Lifecycle Reactor", () => {
    it("starts in 'working' state", () => {
        const reactor = new LifecycleReactor("agent-1");
        expect(reactor.state).toBe("working");
    });

    it("transitions working → pr_open", () => {
        const reactor = new LifecycleReactor("agent-1");
        reactor.transition("pr_open");
        expect(reactor.state).toBe("pr_open");
    });

    it("transitions pr_open → ci_failed", () => {
        const reactor = new LifecycleReactor("agent-1");
        reactor.transition("pr_open");
        reactor.transition("ci_failed");
        expect(reactor.state).toBe("ci_failed");
    });

    it("handles ci_failed → working retry", () => {
        const reactor = new LifecycleReactor("agent-1", { maxRetries: 3 });
        reactor.transition("pr_open");
        reactor.transition("ci_failed");
        reactor.retry();
        expect(reactor.state).toBe("working");
        expect(reactor.retryCount).toBe(1);
    });

    it("escalates after max retries", () => {
        const reactor = new LifecycleReactor("agent-1", { maxRetries: 2 });
        reactor.transition("pr_open");
        reactor.transition("ci_failed");
        reactor.retry();
        reactor.transition("pr_open");
        reactor.transition("ci_failed");
        reactor.retry();
        // Third failure — should escalate
        reactor.transition("pr_open");
        reactor.transition("ci_failed");
        reactor.retry();
        expect(reactor.state).toBe("stuck");
    });

    it("transitions pr_open → review_pending → changes_requested", () => {
        const reactor = new LifecycleReactor("agent-1");
        reactor.transition("pr_open");
        reactor.transition("review_pending");
        reactor.transition("changes_requested");
        expect(reactor.state).toBe("changes_requested");
    });

    it("transitions to approved → mergeable → merged", () => {
        const reactor = new LifecycleReactor("agent-1");
        reactor.transition("pr_open");
        reactor.transition("review_pending");
        reactor.transition("approved");
        reactor.transition("mergeable");
        reactor.transition("merged");
        expect(reactor.state).toBe("merged");
    });

    it("tracks full state history", () => {
        const reactor = new LifecycleReactor("agent-1");
        reactor.transition("pr_open");
        reactor.transition("ci_failed");
        expect(reactor.history).toEqual(["working", "pr_open", "ci_failed"]);
    });

    it("fires reaction callbacks on state change", () => {
        const reactions: string[] = [];
        const reactor = new LifecycleReactor("agent-1");
        reactor.onTransition((from, to) => reactions.push(`${from}→${to}`));
        reactor.transition("pr_open");
        reactor.transition("ci_failed");
        expect(reactions).toEqual(["working→pr_open", "pr_open→ci_failed"]);
    });

    it("reports terminal states", () => {
        const reactor = new LifecycleReactor("agent-1");
        expect(reactor.isTerminal).toBe(false);
        reactor.transition("pr_open");
        reactor.transition("review_pending");
        reactor.transition("approved");
        reactor.transition("mergeable");
        reactor.transition("merged");
        expect(reactor.isTerminal).toBe(true);
    });
});
