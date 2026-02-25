import { describe, it, expect, vi } from "vitest";
import { type Channel, type ChannelMessage, ChannelRouter } from "../../src/channels/types.js";

describe("Channel Interface & Router", () => {
    // ─── Interface shape ──────────────────────────

    it("Channel interface has required methods", () => {
        const channel: Channel = {
            name: "test",
            start: vi.fn(),
            stop: vi.fn(),
            onMessage: vi.fn(),
        };
        expect(channel.name).toBe("test");
    });

    // ─── Router ───────────────────────────────────

    it("should register and list channels", () => {
        const router = new ChannelRouter();
        const ch1: Channel = { name: "slack", start: vi.fn(), stop: vi.fn(), onMessage: vi.fn() };
        const ch2: Channel = { name: "discord", start: vi.fn(), stop: vi.fn(), onMessage: vi.fn() };

        router.register(ch1);
        router.register(ch2);

        expect(router.list()).toEqual(["slack", "discord"]);
    });

    it("should start all channels", async () => {
        const router = new ChannelRouter();
        const start = vi.fn();
        router.register({ name: "a", start, stop: vi.fn(), onMessage: vi.fn() });
        router.register({ name: "b", start, stop: vi.fn(), onMessage: vi.fn() });

        await router.startAll();
        expect(start).toHaveBeenCalledTimes(2);
    });

    it("should stop all channels", async () => {
        const router = new ChannelRouter();
        const stop = vi.fn();
        router.register({ name: "a", start: vi.fn(), stop, onMessage: vi.fn() });

        await router.stopAll();
        expect(stop).toHaveBeenCalledTimes(1);
    });

    it("should dispatch messages to handler", async () => {
        const router = new ChannelRouter();
        const received: ChannelMessage[] = [];

        router.setHandler(async (msg) => {
            received.push(msg);
            return "ok";
        });

        const ch: Channel = {
            name: "test",
            start: vi.fn(),
            stop: vi.fn(),
            onMessage: vi.fn(),
        };

        router.register(ch);

        // Simulate incoming message
        await router.handleIncoming({
            channel: "test",
            senderId: "user-1",
            text: "hello",
            threadId: "t1",
            raw: {},
        });

        expect(received).toHaveLength(1);
        expect(received[0].text).toBe("hello");
        expect(received[0].channel).toBe("test");
    });

    it("should reject messages with no handler", async () => {
        const router = new ChannelRouter();
        await expect(
            router.handleIncoming({
                channel: "test",
                senderId: "u1",
                text: "hi",
                raw: {},
            }),
        ).rejects.toThrow(/no handler/i);
    });
});
