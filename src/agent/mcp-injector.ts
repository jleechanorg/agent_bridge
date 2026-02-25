import type { McpServerConfig } from "../config/types.js";
import { syncMcpServers } from "../config/mcp.js";
import { createLogger } from "../logger.js";

const log = createLogger("agent/mcp-injector");

/**
 * Inject MCP server configurations into the agent's native settings.
 * This should be called before the agent session is created.
 */
export function injectMcpServers(opts: {
    cli: "claude" | "codex";
    servers: Record<string, McpServerConfig>;
}): { synced: string[]; path: string } {
    if (Object.keys(opts.servers).length === 0) {
        log.info("no MCP servers to inject");
        return { synced: [], path: "" };
    }

    log.info(`injecting ${Object.keys(opts.servers).length} MCP server(s) for ${opts.cli}`);
    return syncMcpServers(opts.cli, opts.servers);
}

/**
 * Build a summary of registered MCP servers for display.
 */
export function describeMcpServers(
    servers: Record<string, McpServerConfig>,
): string[] {
    return Object.entries(servers).map(([name, config]) => {
        const args = config.args.length > 0 ? ` ${config.args.join(" ")}` : "";
        const envKeys = config.env ? ` (env: ${Object.keys(config.env).join(", ")})` : "";
        return `${name}: ${config.command}${args}${envKeys}`;
    });
}
