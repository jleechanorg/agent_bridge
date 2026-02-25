import type { Channel, MessageHandler } from "./types.js";

export class WebhookChannel implements Channel {
    readonly name = "webhook";
    readonly port: number;
    private handler: MessageHandler | null = null;

    constructor(opts: { port?: number }) {
        this.port = opts.port ?? 8080;
    }

    async start(): Promise<void> {
        // HTTP server for webhook requests
    }

    async stop(): Promise<void> {
        // Close HTTP server
    }

    onMessage(handler: MessageHandler): void {
        this.handler = handler;
    }
}
