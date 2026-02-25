import { Command } from "commander";
import { loadConfig } from "../config/loader.js";
import { syncMcpServers } from "../config/mcp.js";
import { describeMcpServers } from "../agent/mcp-injector.js";
import { startGatewayServer } from "../gateway/server.js";
import { startSlackProvider } from "../slack/provider.js";
import { AgentLifecycle } from "../agent/lifecycle.js";
import { createLogger } from "../logger.js";
import { formatError } from "../utils.js";

const log = createLogger("cli");

export function buildProgram(): Command {
    const program = new Command();

    program
        .name("agent-orchestrator")
        .description("Multi-channel AI gateway with CLI agent orchestration")
        .version("0.1.0");

    // ─── gateway ───────────────────────────────────────────
    program
        .command("gateway")
        .description("Start the gateway server with Slack integration and agent")
        .option("--port <port>", "Override gateway port")
        .option("--no-slack", "Disable Slack integration")
        .option("--no-agent", "Disable agent auto-start")
        .action(async (opts) => {
            const config = loadConfig();

            if (opts.port) {
                config.gateway.port = parseInt(opts.port, 10);
            }

            log.info("starting agent-orchestrator gateway");

            // Start gateway server (includes agent)
            const server = await startGatewayServer(config);

            log.info(`gateway running on http://${config.gateway.host}:${server.port}`);

            // Start Slack provider if enabled
            if (opts.slack !== false && config.slack.botToken) {
                const abortController = new AbortController();

                process.on("SIGINT", () => abortController.abort());
                process.on("SIGTERM", () => abortController.abort());

                void startSlackProvider({
                    config: config.slack,
                    agent: server.agent,
                    abortSignal: abortController.signal,
                }).catch((err) => {
                    log.error("Slack provider failed", { error: formatError(err) });
                });
            } else if (!config.slack.botToken) {
                log.info("Slack integration disabled (no bot token configured)");
            }

            // Graceful shutdown
            const shutdown = async () => {
                log.info("shutting down...");
                await server.close();
                process.exit(0);
            };

            process.on("SIGINT", shutdown);
            process.on("SIGTERM", shutdown);
        });

    // ─── agent ─────────────────────────────────────────────
    program
        .command("agent")
        .description("Send a one-shot message to the agent")
        .requiredOption("-m, --message <message>", "Message to send")
        .action(async (opts) => {
            const config = loadConfig();
            const agent = new AgentLifecycle({
                config: config.agent,
                mcpServers: config.mcpServers,
            });

            try {
                await agent.start();
                const response = await agent.sendMessage(opts.message);
                console.log(response);
            } finally {
                agent.stop();
            }
        });

    // ─── status ────────────────────────────────────────────
    program
        .command("status")
        .description("Show agent and gateway status")
        .option("--port <port>", "Gateway port", "18789")
        .action(async (opts) => {
            try {
                const res = await fetch(`http://localhost:${opts.port}/api/status`);
                const data = await res.json();
                console.log(JSON.stringify(data, null, 2));
            } catch (err) {
                console.error("Failed to connect to gateway:", formatError(err));
                process.exit(1);
            }
        });

    // ─── mcp sync ──────────────────────────────────────────
    program
        .command("mcp")
        .description("MCP server management")
        .command("sync")
        .description("Sync MCP server configs to agent settings")
        .action(() => {
            const config = loadConfig();
            const servers = config.mcpServers;

            if (Object.keys(servers).length === 0) {
                console.log("No MCP servers configured in config.yaml");
                return;
            }

            console.log("MCP servers to sync:");
            for (const line of describeMcpServers(servers)) {
                console.log(`  - ${line}`);
            }

            const result = syncMcpServers(config.agent.cli, servers);
            console.log(`\nSynced ${result.synced.length} server(s) to ${result.path}`);
        });

    return program;
}
