import type { Channel, MessageHandler } from "./types.js";

export class DiscordChannel implements Channel {
    readonly name = "discord";
    private token: string;
    private handler: MessageHandler | null = null;

    constructor(opts: { token: string }) {
        if (!opts.token) throw new Error("Discord token is required");
        this.token = opts.token;
    }

    async start(): Promise<void> {
        // Discord.js bot connection would go here
        // For now, placeholder for TDD validation
    }

    async stop(): Promise<void> {
        // Disconnect bot
    }

    onMessage(handler: MessageHandler): void {
        this.handler = handler;
    }
}
