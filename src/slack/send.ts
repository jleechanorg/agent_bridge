import type { WebClient } from "@slack/web-api";
import { createLogger } from "../logger.js";

const log = createLogger("slack/send");

/**
 * Send a message to Slack (thread reply).
 */
export async function sendSlackMessage(
    client: WebClient,
    params: {
        channel: string;
        text: string;
        threadTs: string;
    },
): Promise<void> {
    try {
        await client.chat.postMessage({
            channel: params.channel,
            text: params.text,
            thread_ts: params.threadTs,
            unfurl_links: false,
            unfurl_media: false,
        });
    } catch (err) {
        log.error("failed to send Slack message", {
            channel: params.channel,
            error: String(err),
        });
        throw err;
    }
}

/**
 * Update an existing Slack message.
 */
export async function updateSlackMessage(
    client: WebClient,
    params: {
        channel: string;
        ts: string;
        text: string;
    },
): Promise<void> {
    try {
        await client.chat.update({
            channel: params.channel,
            ts: params.ts,
            text: params.text,
        });
    } catch (err) {
        log.error("failed to update Slack message", {
            channel: params.channel,
            error: String(err),
        });
    }
}

/**
 * Add a reaction to a Slack message.
 */
export async function addSlackReaction(
    client: WebClient,
    params: {
        channel: string;
        timestamp: string;
        name: string;
    },
): Promise<void> {
    try {
        await client.reactions.add({
            channel: params.channel,
            timestamp: params.timestamp,
            name: params.name,
        });
    } catch {
        // Reaction may already exist, ignore
    }
}
