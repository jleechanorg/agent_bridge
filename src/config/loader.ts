import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { AgentOrchestratorConfigSchema, applyConfigDefaults, type AgentOrchestratorConfig } from "./types.js";
import { createLogger } from "../logger.js";

const log = createLogger("config");

const CONFIG_FILENAMES = ["config.yaml", "config.yml", "config.json"];

let cachedConfig: AgentOrchestratorConfig | null = null;

function findConfigFile(dir: string): string | null {
    for (const name of CONFIG_FILENAMES) {
        const filePath = path.join(dir, name);
        if (fs.existsSync(filePath)) {
            return filePath;
        }
    }
    return null;
}

function readConfigFile(filePath: string): Record<string, unknown> {
    const content = fs.readFileSync(filePath, "utf-8");
    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".json") {
        return JSON.parse(content) as Record<string, unknown>;
    }
    return (YAML.parse(content) as Record<string, unknown>) ?? {};
}

function applyEnvOverrides(raw: Record<string, unknown>): Record<string, unknown> {
    const result = structuredClone(raw);

    // Slack tokens from env
    const slackSection = (result.slack ?? {}) as Record<string, unknown>;
    if (process.env.SLACK_BOT_TOKEN) {
        slackSection.botToken = process.env.SLACK_BOT_TOKEN;
    }
    if (process.env.SLACK_APP_TOKEN) {
        slackSection.appToken = process.env.SLACK_APP_TOKEN;
    }
    result.slack = slackSection;

    // Gateway config from env
    const gatewaySection = (result.gateway ?? {}) as Record<string, unknown>;
    if (process.env.GATEWAY_PORT) {
        gatewaySection.port = parseInt(process.env.GATEWAY_PORT, 10);
    }
    if (process.env.GATEWAY_HOST) {
        gatewaySection.host = process.env.GATEWAY_HOST;
    }
    if (process.env.AUTH_TOKEN) {
        gatewaySection.authToken = process.env.AUTH_TOKEN;
    }
    result.gateway = gatewaySection;

    // Agent config from env
    const agentSection = (result.agent ?? {}) as Record<string, unknown>;
    if (process.env.AGENT_CLI) {
        agentSection.cli = process.env.AGENT_CLI;
    }
    if (process.env.AGENT_WORKSPACE) {
        agentSection.workspace = process.env.AGENT_WORKSPACE;
    }
    if (process.env.AGENT_MODEL) {
        agentSection.model = process.env.AGENT_MODEL;
    }
    result.agent = agentSection;

    return result;
}

export function loadConfig(configDir?: string): AgentOrchestratorConfig {
    if (cachedConfig) return cachedConfig;

    const dir = configDir ?? process.cwd();
    const configFile = findConfigFile(dir);

    let raw: Record<string, unknown> = {};
    if (configFile) {
        log.info(`loading config from ${configFile}`);
        raw = readConfigFile(configFile);
    } else {
        log.info("no config file found, using defaults + env vars");
    }

    raw = applyEnvOverrides(raw);

    const result = AgentOrchestratorConfigSchema.safeParse(raw);
    if (!result.success) {
        log.error("config validation failed", {
            errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        });
        throw new Error(`Invalid configuration: ${result.error.issues.map((i) => i.message).join(", ")}`);
    }

    cachedConfig = applyConfigDefaults(result.data);
    return cachedConfig;
}

export function clearConfigCache(): void {
    cachedConfig = null;
}

export function reloadConfig(configDir?: string): AgentOrchestratorConfig {
    clearConfigCache();
    return loadConfig(configDir);
}
