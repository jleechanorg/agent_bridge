/**
 * Plugin system — extensible lifecycle hooks.
 */

export interface PluginContext {
    config: unknown;
    logger: unknown;
}

export interface Plugin {
    name: string;
    version: string;
    onLoad?(ctx: PluginContext): void | Promise<void>;
    onMessage?(data: Record<string, unknown>): void | Promise<void>;
    onResponse?(data: Record<string, unknown>): void | Promise<void>;
    onCron?(data: Record<string, unknown>): void | Promise<void>;
    onShutdown?(): void | Promise<void>;
}

export class PluginManager {
    private plugins: Map<string, Plugin> = new Map();

    register(plugin: Plugin): void {
        this.plugins.set(plugin.name, plugin);
    }

    unregister(name: string): void {
        this.plugins.delete(name);
    }

    list(): string[] {
        return [...this.plugins.keys()];
    }

    async loadAll(ctx: PluginContext): Promise<void> {
        for (const plugin of this.plugins.values()) {
            if (plugin.onLoad) await plugin.onLoad(ctx);
        }
    }

    async onMessage(data: Record<string, unknown>): Promise<void> {
        for (const plugin of this.plugins.values()) {
            if (plugin.onMessage) await plugin.onMessage(data);
        }
    }

    async onResponse(data: Record<string, unknown>): Promise<void> {
        for (const plugin of this.plugins.values()) {
            if (plugin.onResponse) await plugin.onResponse(data);
        }
    }

    async onCron(data: Record<string, unknown>): Promise<void> {
        for (const plugin of this.plugins.values()) {
            if (plugin.onCron) await plugin.onCron(data);
        }
    }

    async shutdown(): Promise<void> {
        for (const plugin of this.plugins.values()) {
            if (plugin.onShutdown) await plugin.onShutdown();
        }
    }
}
