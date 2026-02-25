import type { Channel, MessageHandler } from "./types.js";

export class TelegramChannel implements Channel {
    readonly name = "telegram";
    private token: string;
    private handler: MessageHandler | null = null;

    constructor(opts: { token: string }) {
        if (!opts.token) throw new Error("Telegram token is required");
        this.token = opts.token;
    }

    async start(): Promise<void> {
        // Telegram Bot API polling/webhook setup
    }

    async stop(): Promise<void> {
        // Disconnect
    }

    onMessage(handler: MessageHandler): void {
        this.handler = handler;
    }
}
