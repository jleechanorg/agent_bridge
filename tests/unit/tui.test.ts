import { describe, it, expect, vi } from "vitest";
import { TuiCommandParser, TuiFormatter } from "../../src/tui/tui.js";

describe("TUI", () => {
    describe("TuiCommandParser", () => {
        it("parses /help command", () => {
            const result = TuiCommandParser.parse("/help");
            expect(result.command).toBe("help");
            expect(result.args).toEqual([]);
        });

        it("parses /status command", () => {
            const result = TuiCommandParser.parse("/status");
            expect(result.command).toBe("status");
        });

        it("parses /restart command", () => {
            const result = TuiCommandParser.parse("/restart");
            expect(result.command).toBe("restart");
        });

        it("parses /quit command", () => {
            const result = TuiCommandParser.parse("/quit");
            expect(result.command).toBe("quit");
        });

        it("parses command with args", () => {
            const result = TuiCommandParser.parse("/send hello world");
            expect(result.command).toBe("send");
            expect(result.args).toEqual(["hello", "world"]);
        });

        it("returns null for plain messages", () => {
            const result = TuiCommandParser.parse("just a message");
            expect(result).toBeNull();
        });

        it("lists available commands", () => {
            const cmds = TuiCommandParser.availableCommands();
            expect(cmds).toContain("help");
            expect(cmds).toContain("status");
            expect(cmds).toContain("quit");
            expect(cmds).toContain("restart");
        });
    });

    describe("TuiFormatter", () => {
        it("formats status badge", () => {
            expect(TuiFormatter.badge("active")).toContain("active");
        });

        it("formats timestamp", () => {
            const ts = TuiFormatter.timestamp(new Date("2026-01-01T12:00:00Z"));
            expect(ts).toMatch(/12:00/);
        });

        it("formats agent response", () => {
            const formatted = TuiFormatter.agentResponse("Hello world");
            expect(formatted).toContain("Hello world");
        });

        it("formats error", () => {
            const formatted = TuiFormatter.error("Something broke");
            expect(formatted).toContain("Something broke");
        });
    });
});
