import { describe, it, expect, vi } from "vitest";
import { TTSEngine, MacOSTTSProvider, type TTSProvider, type TTSConfig } from "../../src/tts/engine.js";

describe("TTS — Text-to-Speech", () => {
    describe("TTSEngine", () => {
        it("selects provider by name", () => {
            const engine = new TTSEngine();
            engine.registerProvider("macos", new MacOSTTSProvider());
            expect(engine.getProvider("macos")).toBeDefined();
        });

        it("throws for unknown provider", () => {
            const engine = new TTSEngine();
            expect(() => engine.getProvider("unknown")).toThrow(/unknown/i);
        });

        it("lists registered providers", () => {
            const engine = new TTSEngine();
            engine.registerProvider("macos", new MacOSTTSProvider());
            expect(engine.listProviders()).toContain("macos");
        });

        it("has default config", () => {
            const engine = new TTSEngine();
            const config = engine.getConfig();
            expect(config.enabled).toBe(false);
            expect(config.provider).toBe("macos");
        });

        it("updates config", () => {
            const engine = new TTSEngine();
            engine.setConfig({ enabled: true, voice: "Samantha" });
            expect(engine.getConfig().enabled).toBe(true);
            expect(engine.getConfig().voice).toBe("Samantha");
        });
    });

    describe("MacOSTTSProvider", () => {
        it("has correct name", () => {
            const provider = new MacOSTTSProvider();
            expect(provider.name).toBe("macos");
        });

        it("builds say command", () => {
            const provider = new MacOSTTSProvider();
            const cmd = provider.buildCommand("Hello world", {});
            expect(cmd).toContain("say");
            expect(cmd).toContain("Hello world");
        });

        it("builds command with voice", () => {
            const provider = new MacOSTTSProvider();
            const cmd = provider.buildCommand("Hello", { voice: "Samantha" });
            expect(cmd).toContain("-v Samantha");
        });

        it("builds command with rate", () => {
            const provider = new MacOSTTSProvider();
            const cmd = provider.buildCommand("Hello", { rate: 200 });
            expect(cmd).toContain("-r 200");
        });

        it("builds command with output file", () => {
            const provider = new MacOSTTSProvider();
            const cmd = provider.buildCommand("Hello", { outputFile: "/tmp/out.aiff" });
            expect(cmd).toContain("-o /tmp/out.aiff");
        });

        it("escapes single quotes in text", () => {
            const provider = new MacOSTTSProvider();
            const cmd = provider.buildCommand("it's a test", {});
            expect(cmd).not.toContain("it's"); // should be escaped
        });
    });
});
