import { z } from "zod";

export const McpServerSchema = z.object({
    command: z.string(),
    args: z.array(z.string()).default([]),
    env: z.record(z.string(), z.string()).optional(),
});

export const SlackConfigSchema = z.object({
    mode: z.enum(["socket", "http"]).default("socket"),
    botToken: z.string().optional(),
    appToken: z.string().optional(),
    signingSecret: z.string().optional(),
    webhookPath: z.string().default("/slack/events"),
    channels: z.record(z.string(), z.object({ enabled: z.boolean().default(true) })).optional(),
    allowFrom: z.array(z.string()).optional(),
    requireMention: z.boolean().default(true),
});

export const GatewayConfigSchema = z.object({
    port: z.number().default(18789),
    host: z.string().default("0.0.0.0"),
    authToken: z.string().optional(),
});

export const AgentConfigSchema = z.object({
    cli: z.enum(["claude", "codex"]).default("claude"),
    workspace: z.string().default("."),
    model: z.string().optional(),
});

export const CronJobSchema = z.object({
    id: z.string(),
    schedule: z.string(),
    message: z.string(),
    enabled: z.boolean().default(true),
    agentId: z.string().optional(),
});

export const CronConfigSchema = z.object({
    enabled: z.boolean().default(false),
    jobs: z.array(CronJobSchema).default([]),
});

export const SessionConfigSchema = z.object({
    scope: z.enum(["per-sender", "shared"]).default("per-sender"),
});

// Top-level schema — all sections are optional; loader fills defaults
export const AgentOrchestratorConfigSchema = z.object({
    slack: SlackConfigSchema.optional(),
    gateway: GatewayConfigSchema.optional(),
    agent: AgentConfigSchema.optional(),
    mcpServers: z.record(z.string(), McpServerSchema).optional(),
    cron: CronConfigSchema.optional(),
    session: SessionConfigSchema.optional(),
});

export type McpServerConfig = z.infer<typeof McpServerSchema>;
export type SlackConfig = z.infer<typeof SlackConfigSchema>;
export type GatewayConfig = z.infer<typeof GatewayConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type CronJobConfig = z.infer<typeof CronJobSchema>;
export type CronConfig = z.infer<typeof CronConfigSchema>;
export type SessionConfig = z.infer<typeof SessionConfigSchema>;

// The raw parsed type (sections optional)
type RawConfig = z.infer<typeof AgentOrchestratorConfigSchema>;

// The resolved config type (sections always present with defaults)
export interface AgentOrchestratorConfig {
    slack: SlackConfig;
    gateway: GatewayConfig;
    agent: AgentConfig;
    mcpServers: Record<string, McpServerConfig>;
    cron: CronConfig;
    session: SessionConfig;
}

/**
 * Apply defaults to a raw parsed config (fill in missing sections).
 */
export function applyConfigDefaults(raw: RawConfig): AgentOrchestratorConfig {
    return {
        slack: raw.slack ?? SlackConfigSchema.parse({}),
        gateway: raw.gateway ?? GatewayConfigSchema.parse({}),
        agent: raw.agent ?? AgentConfigSchema.parse({}),
        mcpServers: raw.mcpServers ?? {},
        cron: raw.cron ?? CronConfigSchema.parse({}),
        session: raw.session ?? SessionConfigSchema.parse({}),
    };
}
