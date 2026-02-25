import { describe, it, expect, vi } from "vitest";
import {
    type Plugin,
    type PluginContext,
    PluginManager,
} from "../../src/plugins/types.js";

describe("Plugin System", () => {
    // ─── Interface ──────────────────────────────

    it("Plugin interface has lifecycle hooks", () => {
        const plugin: Plugin = {
            name: "test-plugin",
            version: "1.0.0",
            onLoad: vi.fn(),
            onMessage: vi.fn(),
            onResponse: vi.fn(),
            onCron: vi.fn(),
            onShutdown: vi.fn(),
        };
        expect(plugin.name).toBe("test-plugin");
    });

    // ─── PluginManager ─────────────────────────

    it("should register and list plugins", () => {
        const mgr = new PluginManager();
        mgr.register({ name: "a", version: "1.0" });
        mgr.register({ name: "b", version: "2.0" });
        expect(mgr.list()).toEqual(["a", "b"]);
    });

    it("should call onLoad for all plugins", async () => {
        const onLoad = vi.fn();
        const mgr = new PluginManager();
        mgr.register({ name: "loader", version: "1.0", onLoad });
        await mgr.loadAll({} as PluginContext);
        expect(onLoad).toHaveBeenCalledTimes(1);
    });

    it("should call onMessage for all plugins", async () => {
        const onMessage = vi.fn().mockResolvedValue(undefined);
        const mgr = new PluginManager();
        mgr.register({ name: "msg", version: "1.0", onMessage });
        await mgr.onMessage({ text: "hello", senderId: "u1" });
        expect(onMessage).toHaveBeenCalledWith({ text: "hello", senderId: "u1" });
    });

    it("should call onResponse for all plugins", async () => {
        const onResponse = vi.fn().mockResolvedValue(undefined);
        const mgr = new PluginManager();
        mgr.register({ name: "resp", version: "1.0", onResponse });
        await mgr.onResponse({ text: "reply", sessionId: "s1" });
        expect(onResponse).toHaveBeenCalled();
    });

    it("should call onShutdown for all plugins", async () => {
        const onShutdown = vi.fn();
        const mgr = new PluginManager();
        mgr.register({ name: "shutdown", version: "1.0", onShutdown });
        await mgr.shutdown();
        expect(onShutdown).toHaveBeenCalled();
    });

    it("should skip missing hooks gracefully", async () => {
        const mgr = new PluginManager();
        mgr.register({ name: "minimal", version: "1.0" });
        // Should not throw
        await mgr.loadAll({} as PluginContext);
        await mgr.onMessage({ text: "hi" });
        await mgr.onResponse({ text: "bye" });
        await mgr.shutdown();
    });

    it("should unregister plugins", () => {
        const mgr = new PluginManager();
        mgr.register({ name: "removable", version: "1.0" });
        expect(mgr.list()).toContain("removable");
        mgr.unregister("removable");
        expect(mgr.list()).not.toContain("removable");
    });
});
