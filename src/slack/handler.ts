import type { AgentLifecycle } from "../agent/lifecycle.js";
import { createLogger } from "../logger.js";
import { truncate } from "../utils.js";

const log = createLogger("slack/handler");

const MAX_RESPONSE_LENGTH = 3900; // Slack message limit ~4000 chars

export interface SlackMessageContext {
    text: string;
    userId: string;
    channelId: string;
    threadTs?: string;
    ts: string;
}

export interface SlackMessageHandlerDeps {
    agent: AgentLifecycle;
    sendReply: (params: {
        channel: string;
        text: string;
        threadTs: string;
    }) => Promise<void>;
}

/**
 * Create the handler function for incoming Slack messages.
 */
export function createSlackMessageHandler(deps: SlackMessageHandlerDeps) {
    return async function handleSlackMessage(ctx: SlackMessageContext): Promise<void> {
        const { text, userId, channelId, threadTs, ts } = ctx;

        if (!text.trim()) {
            return;
        }

        log.info("received message", {
            userId,
            channel: channelId,
            length: text.length,
        });

        const replyThreadTs = threadTs ?? ts;

        try {
            // Send typing indicator
            await deps.sendReply({
                channel: channelId,
                text: "🤔 Thinking...",
                threadTs: replyThreadTs,
            });

            // Send to agent
            const response = await deps.agent.sendMessage(text);

            // Chunk the response if needed
            const chunks = chunkResponse(response);

            for (const chunk of chunks) {
                await deps.sendReply({
                    channel: channelId,
                    text: chunk,
                    threadTs: replyThreadTs,
                });
            }

            log.info("sent response", {
                channel: channelId,
                chunks: chunks.length,
                totalLength: response.length,
            });
        } catch (err) {
            log.error("failed to handle message", { error: String(err) });
            await deps.sendReply({
                channel: channelId,
                text: `❌ Error: ${truncate(String(err), 200)}`,
                threadTs: replyThreadTs,
            });
        }
    };
}

/**
 * Split a long response into Slack-safe chunks.
 */
function chunkResponse(text: string): string[] {
    if (text.length <= MAX_RESPONSE_LENGTH) {
        return [text];
    }

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
        if (remaining.length <= MAX_RESPONSE_LENGTH) {
            chunks.push(remaining);
            break;
        }

        // Try to split at a newline
        let splitAt = remaining.lastIndexOf("\n", MAX_RESPONSE_LENGTH);
        if (splitAt < MAX_RESPONSE_LENGTH / 2) {
            // Newline too far back, split at a space
            splitAt = remaining.lastIndexOf(" ", MAX_RESPONSE_LENGTH);
        }
        if (splitAt < MAX_RESPONSE_LENGTH / 2) {
            // No good split point, hard split
            splitAt = MAX_RESPONSE_LENGTH;
        }

        chunks.push(remaining.slice(0, splitAt));
        remaining = remaining.slice(splitAt).trimStart();
    }

    return chunks;
}
