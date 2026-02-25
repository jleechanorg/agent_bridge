/**
 * Hook runner — prioritized lifecycle hooks with error isolation.
 */

export interface Hook {
    event: string;
    priority: number;
    handler: (payload: any) => Promise<any>;
    id?: string;
}

export class HookRunner {
    private hooks: Hook[] = [];

    register(hook: Hook): void {
        this.hooks.push(hook);
    }

    unregister(id: string): void {
        this.hooks = this.hooks.filter((h) => h.id !== id);
    }

    list(): Hook[] {
        return [...this.hooks];
    }

    async run(event: string, payload: any): Promise<any> {
        const matching = this.hooks
            .filter((h) => h.event === event)
            .sort((a, b) => a.priority - b.priority);

        let result = payload;
        for (const hook of matching) {
            try {
                const returned = await hook.handler(result);
                if (returned !== undefined) result = returned;
            } catch {
                // Swallow hook errors to prevent cascade failures
            }
        }
        return result;
    }
}
