/**
 * Session key builder — canonical keys with channel segmentation.
 */

export interface SessionKeyParts {
    agentId: string;
    channel?: string;
    senderId: string;
}

export class SessionKeyBuilder {
    static build(parts: SessionKeyParts): string {
        return `${parts.agentId}:${parts.channel ?? "_"}:${parts.senderId}`;
    }

    static parse(key: string): SessionKeyParts {
        const [agentId, channel, senderId] = key.split(":");
        return { agentId, channel: channel === "_" ? undefined : channel, senderId };
    }
}
