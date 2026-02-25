/**
 * Channel allowlist with per-channel/user filtering and rate limiting.
 */

export interface AllowlistConfig {
    channels?: string[];
    users?: string[];
    rateLimitPerMinute?: number;
}

export class ChannelAllowlist {
    private channels?: Set<string>;
    private users?: Set<string>;
    private rateLimitPerMinute?: number;
    private rateCounts: Map<string, { count: number; resetAt: number }> = new Map();

    constructor(config: AllowlistConfig) {
        if (config.channels?.length) {
            this.channels = new Set(config.channels);
        }
        if (config.users?.length) {
            this.users = new Set(config.users);
        }
        this.rateLimitPerMinute = config.rateLimitPerMinute;
    }

    isAllowed(channel: string, userId: string): boolean {
        if (this.channels && !this.channels.has(channel)) return false;
        if (this.users && !this.users.has(userId)) return false;
        return true;
    }

    checkRateLimit(userId: string): boolean {
        if (!this.rateLimitPerMinute) return true;

        const now = Date.now();
        const entry = this.rateCounts.get(userId);

        if (!entry || now >= entry.resetAt) {
            this.rateCounts.set(userId, { count: 1, resetAt: now + 60_000 });
            return true;
        }

        if (entry.count >= this.rateLimitPerMinute) {
            return false;
        }

        entry.count++;
        return true;
    }
}
