import { describe, it, expect } from "vitest";

// Import the handler module to test message chunking
// We test the createSlackMessageHandler indirectly through its behavior

describe("Slack Handler — Message Chunking", () => {
    // We'll test the chunking behavior through the handler
    it("should handle short messages without chunking", async () => {
        const replies: string[] = [];

        const { createSlackMessageHandler } = await import("../../src/slack/handler.js");

        const handler = createSlackMessageHandler({
            agent: {
                sendMessage: async () => "Short reply",
            } as any,
            sendReply: async (params) => {
                replies.push(params.text);
            },
        });

        await handler({
            text: "hello",
            userId: "U1",
            channelId: "C1",
            ts: "1234",
        });

        // Should have the thinking indicator + the actual reply
        expect(replies).toHaveLength(2);
        expect(replies[0]).toContain("Thinking");
        expect(replies[1]).toBe("Short reply");
    });

    it("should chunk long messages", async () => {
        const replies: string[] = [];

        const { createSlackMessageHandler } = await import("../../src/slack/handler.js");

        const longReply = "A".repeat(5000); // Over the 3900 char limit

        const handler = createSlackMessageHandler({
            agent: {
                sendMessage: async () => longReply,
            } as any,
            sendReply: async (params) => {
                replies.push(params.text);
            },
        });

        await handler({
            text: "hello",
            userId: "U1",
            channelId: "C1",
            ts: "1234",
        });

        // Thinking indicator + at least 2 chunks
        expect(replies.length).toBeGreaterThanOrEqual(3);
    });

    it("should send error message on agent failure", async () => {
        const replies: string[] = [];

        const { createSlackMessageHandler } = await import("../../src/slack/handler.js");

        const handler = createSlackMessageHandler({
            agent: {
                sendMessage: async () => { throw new Error("Agent crashed"); },
            } as any,
            sendReply: async (params) => {
                replies.push(params.text);
            },
        });

        await handler({
            text: "hello",
            userId: "U1",
            channelId: "C1",
            ts: "1234",
        });

        const errorMsg = replies.find(r => r.includes("❌"));
        expect(errorMsg).toBeDefined();
        expect(errorMsg).toContain("Agent crashed");
    });

    it("should use threadTs for threaded replies", async () => {
        const threadTsValues: string[] = [];

        const { createSlackMessageHandler } = await import("../../src/slack/handler.js");

        const handler = createSlackMessageHandler({
            agent: {
                sendMessage: async () => "ok",
            } as any,
            sendReply: async (params) => {
                threadTsValues.push(params.threadTs);
            },
        });

        await handler({
            text: "hello",
            userId: "U1",
            channelId: "C1",
            threadTs: "thread-123",
            ts: "msg-456",
        });

        // All replies should go to the thread
        expect(threadTsValues.every(t => t === "thread-123")).toBe(true);
    });

    it("should skip empty messages", async () => {
        const replies: string[] = [];

        const { createSlackMessageHandler } = await import("../../src/slack/handler.js");

        const handler = createSlackMessageHandler({
            agent: {
                sendMessage: async () => "ok",
            } as any,
            sendReply: async (params) => {
                replies.push(params.text);
            },
        });

        await handler({
            text: "   ",
            userId: "U1",
            channelId: "C1",
            ts: "1234",
        });

        expect(replies).toHaveLength(0);
    });
});
