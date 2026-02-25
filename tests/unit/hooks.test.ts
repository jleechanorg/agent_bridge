import { describe, it, expect, vi } from "vitest";
import { HookRunner, type Hook } from "../../src/hooks/runner.js";

describe("Hooks", () => {
    it("runs hooks in priority order", async () => {
        const order: string[] = [];
        const runner = new HookRunner();
        runner.register({ event: "test", priority: 10, handler: async () => { order.push("low"); } });
        runner.register({ event: "test", priority: 1, handler: async () => { order.push("high"); } });
        await runner.run("test", {});
        expect(order).toEqual(["high", "low"]);
    });

    it("passes payload through hooks", async () => {
        const runner = new HookRunner();
        runner.register({
            event: "transform",
            priority: 1,
            handler: async (payload: any) => ({ ...payload, modified: true }),
        });
        const result = await runner.run("transform", { original: true });
        expect(result.modified).toBe(true);
        expect(result.original).toBe(true);
    });

    it("runs only matching event hooks", async () => {
        const runner = new HookRunner();
        const fn = vi.fn();
        runner.register({ event: "a", priority: 1, handler: fn });
        await runner.run("b", {});
        expect(fn).not.toHaveBeenCalled();
    });

    it("handles hook errors gracefully", async () => {
        const runner = new HookRunner();
        runner.register({
            event: "fail",
            priority: 1,
            handler: async () => { throw new Error("hook error"); },
        });
        // Should not throw
        await runner.run("fail", {});
    });

    it("lists registered hooks", () => {
        const runner = new HookRunner();
        runner.register({ event: "a", priority: 1, handler: async () => { }, id: "h1" });
        runner.register({ event: "b", priority: 2, handler: async () => { }, id: "h2" });
        expect(runner.list()).toHaveLength(2);
    });

    it("unregisters hooks by id", () => {
        const runner = new HookRunner();
        runner.register({ event: "a", priority: 1, handler: async () => { }, id: "removable" });
        runner.unregister("removable");
        expect(runner.list()).toHaveLength(0);
    });
});
