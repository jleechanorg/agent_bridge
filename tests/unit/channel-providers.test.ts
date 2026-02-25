import { describe, it, expect } from "vitest";
import { DiscordChannel } from "../../src/channels/discord.js";
import { TelegramChannel } from "../../src/channels/telegram.js";
import { WebhookChannel } from "../../src/channels/webhook.js";
import { ChannelAllowlist } from "../../src/channels/allowlist.js";

describe("Channel Providers", () => {
    describe("DiscordChannel", () => {
        it("has correct name", () => {
            const ch = new DiscordChannel({ token: "test" });
            expect(ch.name).toBe("discord");
        });

        it("requires token", () => {
            expect(() => new DiscordChannel({ token: "" })).toThrow(/token/i);
        });
    });

    describe("TelegramChannel", () => {
        it("has correct name", () => {
            const ch = new TelegramChannel({ token: "test" });
            expect(ch.name).toBe("telegram");
        });

        it("requires token", () => {
            expect(() => new TelegramChannel({ token: "" })).toThrow(/token/i);
        });
    });

    describe("WebhookChannel", () => {
        it("has correct name", () => {
            const ch = new WebhookChannel({ port: 9999 });
            expect(ch.name).toBe("webhook");
        });

        it("has default port", () => {
            const ch = new WebhookChannel({});
            expect(ch.port).toBe(8080);
        });

        it("uses custom port", () => {
            const ch = new WebhookChannel({ port: 3456 });
            expect(ch.port).toBe(3456);
        });
    });

    describe("ChannelAllowlist", () => {
        it("allows all when no rules", () => {
            const al = new ChannelAllowlist({});
            expect(al.isAllowed("any-channel", "any-user")).toBe(true);
        });

        it("filters by channel", () => {
            const al = new ChannelAllowlist({ channels: ["slack", "discord"] });
            expect(al.isAllowed("slack", "u1")).toBe(true);
            expect(al.isAllowed("telegram", "u1")).toBe(false);
        });

        it("filters by user", () => {
            const al = new ChannelAllowlist({ users: ["u1", "u2"] });
            expect(al.isAllowed("any", "u1")).toBe(true);
            expect(al.isAllowed("any", "u3")).toBe(false);
        });

        it("filters by both channel and user", () => {
            const al = new ChannelAllowlist({
                channels: ["slack"],
                users: ["admin"],
            });
            expect(al.isAllowed("slack", "admin")).toBe(true);
            expect(al.isAllowed("slack", "nobody")).toBe(false);
            expect(al.isAllowed("discord", "admin")).toBe(false);
        });

        it("rate limits by user", () => {
            const al = new ChannelAllowlist({
                rateLimitPerMinute: 2,
            });

            expect(al.checkRateLimit("u1")).toBe(true);
            expect(al.checkRateLimit("u1")).toBe(true);
            expect(al.checkRateLimit("u1")).toBe(false); // Over limit
        });
    });
});
