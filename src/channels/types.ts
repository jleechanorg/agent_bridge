/**
 * Channel interface and router — abstracts multi-channel messaging.
 */

export interface ChannelMessage {
    channel: string;
    senderId: string;
    text: string;
    threadId?: string;
    raw: unknown;
}

export type MessageHandler = (msg: ChannelMessage) => Promise<string>;

export interface Channel {
    readonly name: string;
    start(): void | Promise<void>;
    stop(): void | Promise<void>;
    onMessage(handler: MessageHandler): void;
}

export class ChannelRouter {
    private channels: Map<string, Channel> = new Map();
    private handler: MessageHandler | null = null;

    register(channel: Channel): void {
        this.channels.set(channel.name, channel);
    }

    list(): string[] {
        return [...this.channels.keys()];
    }

    setHandler(handler: MessageHandler): void {
        this.handler = handler;
    }

    async startAll(): Promise<void> {
        for (const ch of this.channels.values()) {
            await ch.start();
        }
    }

    async stopAll(): Promise<void> {
        for (const ch of this.channels.values()) {
            await ch.stop();
        }
    }

    async handleIncoming(msg: ChannelMessage): Promise<string> {
        if (!this.handler) {
            throw new Error("No handler registered for incoming messages");
        }
        return this.handler(msg);
    }

    getChannel(name: string): Channel | undefined {
        return this.channels.get(name);
    }
}
