import { describe, it, expect } from "vitest";
import { ClaudeRunner } from "../../src/agent/runners/claude.js";
import { CodexRunner } from "../../src/agent/runners/codex.js";
import { GeminiRunner } from "../../src/agent/runners/gemini.js";
import { CursorRunner } from "../../src/agent/runners/cursor.js";

describe("Runner implementations", () => {
    // ─── Claude ──────────────────────────────────

    describe("ClaudeRunner", () => {
        it("has correct name", () => {
            const runner = new ClaudeRunner({
                workspace: "/tmp",
                sessionName: "test-claude",
            });
            expect(runner.name).toBe("claude");
        });

        it("builds correct command", () => {
            const runner = new ClaudeRunner({
                workspace: "/tmp",
                sessionName: "test-claude",
            });
            expect(runner.buildCommand()).toBe("claude --dangerously-skip-permissions");
        });

        it("builds command with model", () => {
            const runner = new ClaudeRunner({
                workspace: "/tmp",
                sessionName: "test-claude",
                model: "sonnet",
            });
            expect(runner.buildCommand()).toContain("--model sonnet");
        });

        it("gets completion markers", () => {
            const runner = new ClaudeRunner({
                workspace: "/tmp",
                sessionName: "test-claude",
            });
            const markers = runner.getCompletionMarkers();
            expect(markers.length).toBeGreaterThan(0);
        });
    });

    // ─── Codex ───────────────────────────────────

    describe("CodexRunner", () => {
        it("has correct name", () => {
            const runner = new CodexRunner({
                workspace: "/tmp",
                sessionName: "test-codex",
            });
            expect(runner.name).toBe("codex");
        });

        it("builds correct command", () => {
            const runner = new CodexRunner({
                workspace: "/tmp",
                sessionName: "test-codex",
            });
            expect(runner.buildCommand()).toBe("codex --full-auto");
        });
    });

    // ─── Gemini ──────────────────────────────────

    describe("GeminiRunner", () => {
        it("has correct name", () => {
            const runner = new GeminiRunner({
                workspace: "/tmp",
                sessionName: "test-gemini",
            });
            expect(runner.name).toBe("gemini");
        });

        it("builds correct command", () => {
            const runner = new GeminiRunner({
                workspace: "/tmp",
                sessionName: "test-gemini",
            });
            const cmd = runner.buildCommand();
            expect(cmd).toContain("gemini");
        });

        it("builds command with model", () => {
            const runner = new GeminiRunner({
                workspace: "/tmp",
                sessionName: "test-gemini",
                model: "gemini-2.5-pro",
            });
            const cmd = runner.buildCommand();
            expect(cmd).toContain("gemini-2.5-pro");
        });

        it("gets gemini-specific completion markers", () => {
            const runner = new GeminiRunner({
                workspace: "/tmp",
                sessionName: "test-gemini",
            });
            const markers = runner.getCompletionMarkers();
            expect(markers.length).toBeGreaterThan(0);
        });
    });

    // ─── Cursor ──────────────────────────────────

    describe("CursorRunner", () => {
        it("has correct name", () => {
            const runner = new CursorRunner({
                workspace: "/tmp",
                sessionName: "test-cursor",
            });
            expect(runner.name).toBe("cursor");
        });

        it("builds correct command", () => {
            const runner = new CursorRunner({
                workspace: "/tmp",
                sessionName: "test-cursor",
            });
            const cmd = runner.buildCommand();
            expect(cmd).toContain("cursor");
        });
    });

    // ─── Common patterns ────────────────────────

    describe("Common Runner behavior", () => {
        it("all runners strip ANSI codes", () => {
            const runners = [
                new ClaudeRunner({ workspace: "/tmp", sessionName: "t" }),
                new CodexRunner({ workspace: "/tmp", sessionName: "t" }),
                new GeminiRunner({ workspace: "/tmp", sessionName: "t" }),
                new CursorRunner({ workspace: "/tmp", sessionName: "t" }),
            ];

            const ansiStr = "\x1b[31mred\x1b[0m text";
            for (const runner of runners) {
                const cleaned = runner.stripAnsi(ansiStr);
                expect(cleaned).toBe("red text");
                expect(cleaned).not.toContain("\x1b");
            }
        });

        it("all runners have default timeouts", () => {
            const runners = [
                new ClaudeRunner({ workspace: "/tmp", sessionName: "t" }),
                new CodexRunner({ workspace: "/tmp", sessionName: "t" }),
                new GeminiRunner({ workspace: "/tmp", sessionName: "t" }),
                new CursorRunner({ workspace: "/tmp", sessionName: "t" }),
            ];

            for (const runner of runners) {
                expect(runner.getTimeout()).toBeGreaterThan(0);
                expect(runner.getPollInterval()).toBeGreaterThan(0);
            }
        });
    });
});
