import SlackBolt from "@slack/bolt";
import type { SlackConfig } from "../config/types.js";
import type { AgentLifecycle } from "../agent/lifecycle.js";
import { createSlackMessageHandler } from "./handler.js";
import { sendSlackMessage, addSlackReaction } from "./send.js";
import { createLogger } from "../logger.js";

const log = createLogger("slack/provider");

// Handle CJS/ESM dual-mode import
const slackBoltModule = SlackBolt as typeof import("@slack/bolt") & {
    default?: typeof import("@slack/bolt");
};
const slackBolt =
    (slackBoltModule.App ? slackBoltModule : slackBoltModule.default) ?? slackBoltModule;
const { App } = slackBolt;

export interface SlackProviderOpts {
    config: SlackConfig;
    agent: AgentLifecycle;
    abortSignal?: AbortSignal;
}

/**
 * Start the Slack provider (socket mode).
 * Listens for messages mentioning the bot, DMs, and app mentions.
 */
export async function startSlackProvider(opts: SlackProviderOpts): Promise<void> {
    const { config, agent, abortSignal } = opts;

    const botToken = config.botToken;
    const appToken = config.appToken;

    if (!botToken) {
        throw new Error(
            "Slack bot token is required. Set slack.botToken in config.yaml or SLACK_BOT_TOKEN env var.",
        );
    }
    if (config.mode === "socket" && !appToken) {
        throw new Error(
            "Slack app token is required for socket mode. Set slack.appToken in config.yaml or SLACK_APP_TOKEN env var.",
        );
    }

    const app = new App({
        token: botToken,
        appToken,
        socketMode: config.mode === "socket",
    });

    // Resolve bot user ID
    let botUserId = "";
    try {
        const auth = await app.client.auth.test({ token: botToken });
        botUserId = auth.user_id ?? "";
        log.info("authenticated with Slack", {
            userId: botUserId,
            teamId: auth.team_id,
        });
    } catch (err) {
        log.warn("Slack auth.test failed, will use regex for mention detection", {
            error: String(err),
        });
    }

    // Create the message handler
    const handleMessage = createSlackMessageHandler({
        agent,
        sendReply: async (params) => {
            await sendSlackMessage(app.client, params);
        },
    });

    // Listen for direct messages
    app.event("message", async ({ event, say }) => {
        const msg = event as {
            text?: string;
            user?: string;
            channel?: string;
            thread_ts?: string;
            ts?: string;
            subtype?: string;
            channel_type?: string;
            bot_id?: string;
        };

        // Skip bot messages, edits, deletes, etc.
        if (msg.subtype || msg.bot_id || !msg.text || !msg.user) {
            return;
        }

        // Check if this is a DM or a channel mention
        const isDm = msg.channel_type === "im";
        const isMention = botUserId
            ? msg.text.includes(`<@${botUserId}>`)
            : false;

        if (!isDm && !isMention && config.requireMention) {
            return;
        }

        // Check channel allowlist
        if (config.channels && msg.channel) {
            const channelConfig = config.channels[msg.channel];
            if (channelConfig && !channelConfig.enabled) {
                return;
            }
        }

        // Check user allowlist
        if (config.allowFrom && config.allowFrom.length > 0) {
            if (!config.allowFrom.includes(msg.user)) {
                log.debug("user not in allowFrom list", { user: msg.user });
                return;
            }
        }

        // Strip bot mention from text
        let cleanText = msg.text;
        if (botUserId) {
            cleanText = cleanText.replace(new RegExp(`<@${botUserId}>`, "g"), "").trim();
        }

        // Add ack reaction
        if (msg.channel && msg.ts) {
            await addSlackReaction(app.client, {
                channel: msg.channel,
                timestamp: msg.ts,
                name: "eyes",
            });
        }

        await handleMessage({
            text: cleanText,
            userId: msg.user,
            channelId: msg.channel ?? "",
            threadTs: msg.thread_ts,
            ts: msg.ts ?? "",
        });
    });

    // Listen for app_mention events
    app.event("app_mention", async ({ event }) => {
        const msg = event as {
            text?: string;
            user?: string;
            channel?: string;
            thread_ts?: string;
            ts?: string;
        };

        if (!msg.text || !msg.user) return;

        let cleanText = msg.text;
        if (botUserId) {
            cleanText = cleanText.replace(new RegExp(`<@${botUserId}>`, "g"), "").trim();
        }

        if (msg.channel && msg.ts) {
            await addSlackReaction(app.client, {
                channel: msg.channel,
                timestamp: msg.ts,
                name: "eyes",
            });
        }

        await handleMessage({
            text: cleanText,
            userId: msg.user,
            channelId: msg.channel ?? "",
            threadTs: msg.thread_ts,
            ts: msg.ts ?? "",
        });
    });

    // Handle abort
    const stopOnAbort = () => {
        if (abortSignal?.aborted) {
            void app.stop();
        }
    };
    abortSignal?.addEventListener("abort", stopOnAbort, { once: true });

    try {
        await app.start();
        log.info("Slack provider started (socket mode)");

        // Wait until aborted
        await new Promise<void>((resolve) => {
            abortSignal?.addEventListener("abort", () => resolve(), { once: true });
        });
    } finally {
        abortSignal?.removeEventListener("abort", stopOnAbort);
        await app.stop().catch(() => undefined);
        log.info("Slack provider stopped");
    }
}
