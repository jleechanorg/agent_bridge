/**
 * Session key resolver — canonical keys with aliases.
 */

export class SessionKeyResolver {
    private aliases: Map<string, string> = new Map();

    resolve(opts: { agentId: string; senderId: string }): string {
        return `${opts.agentId}:${opts.senderId}`;
    }

    setAlias(alias: string, canonicalKey: string): void {
        this.aliases.set(alias, canonicalKey);
    }

    resolveAlias(alias: string): string | undefined {
        return this.aliases.get(alias);
    }

    removeAlias(alias: string): void {
        this.aliases.delete(alias);
    }
}
