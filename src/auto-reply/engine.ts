/**
 * Auto-reply — Template engine with pattern matching.
 */

export interface ReplyRule {
    pattern: string | RegExp;
    response: string;
    id?: string;
}

export const defaultTemplates = {
    away: "I'm currently away. I'll get back to you soon.",
    rateLimit: "You're sending messages too fast. Please slow down.",
    error: "Something went wrong processing your request. Please try again.",
};

export class AutoReplyEngine {
    private rules: ReplyRule[] = [];

    addRule(rule: ReplyRule): void {
        this.rules.push(rule);
    }

    removeRule(id: string): void {
        this.rules = this.rules.filter((r) => r.id !== id);
    }

    listRules(): ReplyRule[] {
        return [...this.rules];
    }

    match(text: string, vars?: Record<string, string>): string | null {
        for (const rule of this.rules) {
            const matched =
                rule.pattern instanceof RegExp
                    ? rule.pattern.test(text)
                    : text === rule.pattern;

            if (matched) {
                let response = rule.response;
                if (vars) {
                    for (const [key, value] of Object.entries(vars)) {
                        response = response.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
                    }
                }
                return response;
            }
        }
        return null;
    }
}
