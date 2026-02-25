import { describe, it, expect, vi } from "vitest";
import { safeExec, CommandQueue } from "../../src/process/exec.js";

describe("Process Management", () => {
    describe("safeExec", () => {
        it("executes a command and captures output", async () => {
            const result = await safeExec("echo hello");
            expect(result.stdout.trim()).toBe("hello");
            expect(result.exitCode).toBe(0);
        });

        it("captures stderr", async () => {
            const result = await safeExec("echo error >&2");
            expect(result.stderr.trim()).toBe("error");
        });

        it("returns non-zero exit code on failure", async () => {
            const result = await safeExec("exit 42", { shell: true });
            expect(result.exitCode).toBe(42);
        });

        it("times out long commands", async () => {
            const result = await safeExec("sleep 10", { timeoutMs: 100 });
            expect(result.timedOut).toBe(true);
        });
    });

    describe("CommandQueue", () => {
        it("executes commands in order", async () => {
            const queue = new CommandQueue();
            const results: string[] = [];

            await queue.enqueue(async () => { results.push("a"); });
            await queue.enqueue(async () => { results.push("b"); });
            await queue.enqueue(async () => { results.push("c"); });

            expect(results).toEqual(["a", "b", "c"]);
        });

        it("tracks queue length", () => {
            const queue = new CommandQueue();
            expect(queue.length).toBe(0);
        });

        it("handles errors without breaking queue", async () => {
            const queue = new CommandQueue();
            const results: string[] = [];

            await queue.enqueue(async () => { results.push("ok"); });
            try {
                await queue.enqueue(async () => { throw new Error("fail"); });
            } catch { }
            await queue.enqueue(async () => { results.push("after-error"); });

            expect(results).toEqual(["ok", "after-error"]);
        });
    });
});
