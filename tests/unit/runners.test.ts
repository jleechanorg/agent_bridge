import { describe, it, expect, vi, beforeEach } from "vitest";
import { type Runner, type RunnerConfig, createRunner, RunnerFactory } from "../../src/agent/runners/index.js";

describe("Runner Interface & Factory", () => {
    // ─── Interface shape ─────────────────────────

    it("Runner interface has required methods", () => {
        const runner: Runner = {
            name: "test",
            start: vi.fn(),
            stop: vi.fn(),
            isAlive: vi.fn(),
            send: vi.fn(),
            capture: vi.fn(),
        };

        expect(runner.name).toBe("test");
        expect(typeof runner.start).toBe("function");
        expect(typeof runner.stop).toBe("function");
        expect(typeof runner.isAlive).toBe("function");
        expect(typeof runner.send).toBe("function");
        expect(typeof runner.capture).toBe("function");
    });

    // ─── Factory ─────────────────────────────────

    it("should create a claude runner", () => {
        const runner = createRunner({
            cli: "claude",
            workspace: "/tmp/test",
            sessionName: "test-claude",
        });

        expect(runner).toBeDefined();
        expect(runner.name).toBe("claude");
    });

    it("should create a codex runner", () => {
        const runner = createRunner({
            cli: "codex",
            workspace: "/tmp/test",
            sessionName: "test-codex",
        });

        expect(runner).toBeDefined();
        expect(runner.name).toBe("codex");
    });

    it("should create a gemini runner", () => {
        const runner = createRunner({
            cli: "gemini",
            workspace: "/tmp/test",
            sessionName: "test-gemini",
        });

        expect(runner).toBeDefined();
        expect(runner.name).toBe("gemini");
    });

    it("should create a cursor runner", () => {
        const runner = createRunner({
            cli: "cursor",
            workspace: "/tmp/test",
            sessionName: "test-cursor",
        });

        expect(runner).toBeDefined();
        expect(runner.name).toBe("cursor");
    });

    it("should throw for unknown CLI", () => {
        expect(() =>
            createRunner({
                cli: "unknown-cli" as any,
                workspace: "/tmp/test",
                sessionName: "test",
            }),
        ).toThrow(/unsupported/i);
    });

    // ─── RunnerFactory registry ──────────────────

    it("should register and retrieve custom runners", () => {
        const factory = new RunnerFactory();
        const mockCreate = vi.fn(() => ({
            name: "custom",
            start: vi.fn(),
            stop: vi.fn(),
            isAlive: vi.fn(),
            send: vi.fn(),
            capture: vi.fn(),
        }));

        factory.register("custom", mockCreate);

        const runner = factory.create({
            cli: "custom" as any,
            workspace: "/tmp",
            sessionName: "test",
        });

        expect(runner.name).toBe("custom");
        expect(mockCreate).toHaveBeenCalled();
    });

    it("should list registered runner names", () => {
        const factory = new RunnerFactory();
        factory.register("a", vi.fn());
        factory.register("b", vi.fn());

        const names = factory.listRegistered();
        expect(names).toContain("a");
        expect(names).toContain("b");
    });
});
