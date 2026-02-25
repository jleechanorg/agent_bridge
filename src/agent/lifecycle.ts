import type { AgentConfig, McpServerConfig } from "../config/types.js";
import { syncMcpServers } from "../config/mcp.js";
import { createLogger } from "../logger.js";
import { sleep } from "../utils.js";
import {
    createAgentSession,
    isSessionAlive,
    killSession,
    captureSessionOutput,
    sendToSession,
    waitForAgentResponse,
} from "./bridge.js";

const log = createLogger("agent/lifecycle");

const DEFAULT_SESSION_NAME = "agent-gateway-main";
const HEALTH_CHECK_INTERVAL_MS = 30_000;
const RESTART_DELAY_MS = 5_000;

export interface AgentState {
    sessionName: string;
    cli: "claude" | "codex";
    alive: boolean;
    startedAt: number | null;
    lastHealthCheck: number | null;
    messageCount: number;
}

export class AgentLifecycle {
    private state: AgentState;
    private healthTimer: ReturnType<typeof setInterval> | null = null;
    private config: AgentConfig;
    private mcpServers: Record<string, McpServerConfig>;

    constructor(opts: {
        config: AgentConfig;
        mcpServers: Record<string, McpServerConfig>;
        sessionName?: string;
    }) {
        this.config = opts.config;
        this.mcpServers = opts.mcpServers;
        this.state = {
            sessionName: opts.sessionName ?? DEFAULT_SESSION_NAME,
            cli: opts.config.cli,
            alive: false,
            startedAt: null,
            lastHealthCheck: null,
            messageCount: 0,
        };
    }

    /**
     * Start the agent session and begin health monitoring.
     */
    async start(): Promise<void> {
        log.info("starting agent lifecycle", {
            cli: this.config.cli,
            workspace: this.config.workspace,
        });

        // Sync MCP servers before launching the agent
        if (Object.keys(this.mcpServers).length > 0) {
            syncMcpServers(this.config.cli, this.mcpServers);
        }

        // Create the tmux session
        createAgentSession({
            sessionName: this.state.sessionName,
            cli: this.config.cli,
            workspace: this.config.workspace,
            model: this.config.model,
        });

        this.state.alive = true;
        this.state.startedAt = Date.now();

        // Start health check loop
        this.healthTimer = setInterval(() => {
            this.checkHealth();
        }, HEALTH_CHECK_INTERVAL_MS);

        log.info("agent started successfully", {
            sessionName: this.state.sessionName,
        });
    }

    /**
     * Send a message to the agent and wait for a response.
     */
    async sendMessage(message: string): Promise<string> {
        if (!this.state.alive) {
            log.warn("agent is not alive, attempting restart");
            await this.restart();
        }

        const beforeOutput = captureSessionOutput(this.state.sessionName);
        sendToSession(this.state.sessionName, message);
        this.state.messageCount++;

        const afterOutput = await waitForAgentResponse(this.state.sessionName, {
            timeoutMs: 120_000,
            pollIntervalMs: 1500,
            stableCountThreshold: 3,
        });

        // Extract only the new output (diff from before)
        const newOutput = extractNewOutput(beforeOutput, afterOutput);
        return newOutput || afterOutput;
    }

    /**
     * Check if the agent session is still alive.
     */
    checkHealth(): boolean {
        const alive = isSessionAlive(this.state.sessionName);
        this.state.alive = alive;
        this.state.lastHealthCheck = Date.now();

        if (!alive) {
            log.warn("agent session is dead, will restart on next message");
        }

        return alive;
    }

    /**
     * Restart the agent session.
     */
    async restart(): Promise<void> {
        log.info("restarting agent");
        this.stop();
        await sleep(RESTART_DELAY_MS);
        await this.start();
    }

    /**
     * Stop the agent and clean up.
     */
    stop(): void {
        if (this.healthTimer) {
            clearInterval(this.healthTimer);
            this.healthTimer = null;
        }

        killSession(this.state.sessionName);
        this.state.alive = false;
        log.info("agent stopped");
    }

    /**
     * Get the current agent state.
     */
    getState(): Readonly<AgentState> {
        // Refresh alive status
        this.state.alive = isSessionAlive(this.state.sessionName);
        return { ...this.state };
    }
}

/**
 * Extract new output by finding content that wasn't in the before snapshot.
 */
function extractNewOutput(before: string, after: string): string {
    const beforeLines = before.split("\n");
    const afterLines = after.split("\n");

    // Find where the new content starts
    let overlapEnd = 0;
    for (let i = 0; i < Math.min(beforeLines.length, afterLines.length); i++) {
        if (beforeLines[beforeLines.length - 1 - i] === afterLines[afterLines.length - 1 - i]) {
            continue;
        }
        overlapEnd = afterLines.length - i;
        break;
    }

    if (overlapEnd === 0) {
        // All content is the same or new content appended
        if (afterLines.length > beforeLines.length) {
            return afterLines.slice(beforeLines.length).join("\n").trim();
        }
        return "";
    }

    return afterLines.slice(overlapEnd).join("\n").trim();
}
