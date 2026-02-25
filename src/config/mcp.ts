import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { McpServerConfig } from "./types.js";
import { createLogger } from "../logger.js";

const log = createLogger("config/mcp");

/**
 * Resolve the path to Claude Code's settings file.
 */
function getClaudeSettingsPath(): string {
    return path.join(os.homedir(), ".claude", "settings.json");
}

/**
 * Resolve the path to Codex's config file.
 */
function getCodexConfigPath(): string {
    return path.join(os.homedir(), ".codex", "config.json");
}

function readJsonFile(filePath: string): Record<string, unknown> {
    try {
        const content = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(content) as Record<string, unknown>;
    } catch {
        return {};
    }
}

function writeJsonFile(filePath: string, data: Record<string, unknown>): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

/**
 * Sync MCP server configs into Claude Code's settings.json.
 */
export function syncMcpServersToClaudeSettings(
    servers: Record<string, McpServerConfig>,
): { synced: string[]; path: string } {
    const settingsPath = getClaudeSettingsPath();
    const settings = readJsonFile(settingsPath);

    // Claude Code stores MCP servers under the "mcpServers" key
    const existingServers = (settings.mcpServers ?? {}) as Record<string, unknown>;

    const synced: string[] = [];
    for (const [name, config] of Object.entries(servers)) {
        const entry: Record<string, unknown> = {
            command: config.command,
            args: config.args,
        };
        if (config.env && Object.keys(config.env).length > 0) {
            entry.env = config.env;
        }
        existingServers[name] = entry;
        synced.push(name);
    }

    settings.mcpServers = existingServers;
    writeJsonFile(settingsPath, settings);

    log.info(`synced ${synced.length} MCP server(s) to Claude settings`, {
        path: settingsPath,
        servers: synced,
    });

    return { synced, path: settingsPath };
}

/**
 * Sync MCP server configs into Codex's config.json.
 */
export function syncMcpServersToCodexConfig(
    servers: Record<string, McpServerConfig>,
): { synced: string[]; path: string } {
    const configPath = getCodexConfigPath();
    const config = readJsonFile(configPath);

    const existingServers = (config.mcpServers ?? {}) as Record<string, unknown>;

    const synced: string[] = [];
    for (const [name, serverConfig] of Object.entries(servers)) {
        const entry: Record<string, unknown> = {
            command: serverConfig.command,
            args: serverConfig.args,
        };
        if (serverConfig.env && Object.keys(serverConfig.env).length > 0) {
            entry.env = serverConfig.env;
        }
        existingServers[name] = entry;
        synced.push(name);
    }

    config.mcpServers = existingServers;
    writeJsonFile(configPath, config);

    log.info(`synced ${synced.length} MCP server(s) to Codex config`, {
        path: configPath,
        servers: synced,
    });

    return { synced, path: configPath };
}

/**
 * Sync MCP servers to the appropriate agent CLI config.
 */
export function syncMcpServers(
    cli: "claude" | "codex",
    servers: Record<string, McpServerConfig>,
): { synced: string[]; path: string } {
    if (Object.keys(servers).length === 0) {
        log.info("no MCP servers configured, skipping sync");
        return { synced: [], path: "" };
    }

    if (cli === "claude") {
        return syncMcpServersToClaudeSettings(servers);
    }
    return syncMcpServersToCodexConfig(servers);
}
