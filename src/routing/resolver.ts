/**
 * Route resolver — match messages to agents by channel, sender, or keyword.
 */

export interface RouteRule {
    channel?: string;
    senderPattern?: RegExp;
    keyword?: string;
    agentId: string;
}

export interface RouteInput {
    channel: string;
    senderId: string;
    text?: string;
}

export class RouteResolver {
    private rules: RouteRule[] = [];

    addRule(rule: RouteRule): void {
        this.rules.push(rule);
    }

    resolve(input: RouteInput): RouteRule | null {
        for (const rule of this.rules) {
            if (rule.channel && rule.channel !== input.channel) continue;
            if (rule.senderPattern && !rule.senderPattern.test(input.senderId)) continue;
            if (rule.keyword && input.text && !input.text.includes(rule.keyword)) continue;
            if (rule.keyword && !input.text) continue;
            return rule;
        }
        return null;
    }
}
