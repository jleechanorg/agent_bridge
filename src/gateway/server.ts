import express from "express";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentOrchestratorConfig } from "../config/types.js";
import { AgentLifecycle } from "../agent/lifecycle.js";
import { captureSessionOutput } from "../agent/bridge.js";
import { createAuthMiddleware } from "./auth.js";
import { SessionStore } from "./sessions.js";
import { CronService } from "./cron.js";
import { createWebSocketServer, type WsBroadcaster } from "./websocket.js";
import { createLogger } from "../logger.js";
import { formatError } from "../utils.js";
import { MCPServer } from "./mcp-server.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const log = createLogger("gateway/server");

export interface GatewayServer {
    close: () => Promise<void>;
    port: number;
    agent: AgentLifecycle;
    sessions: SessionStore;
    cron: CronService;
    ws: WsBroadcaster;
}

export async function startGatewayServer(
    config: AgentOrchestratorConfig,
): Promise<GatewayServer> {
    const { gateway: gatewayCfg } = config;

    // Initialize agent with port-unique session name
    const agent = new AgentLifecycle({
        config: config.agent,
        mcpServers: config.mcpServers,
        sessionName: `agent-gateway-${gatewayCfg.port}`,
    });

    // Initialize session store
    const sessions = new SessionStore();

    // Activity log (in-memory ring buffer)
    const activityLog: Array<{ event: string; data: unknown; timestamp: number }> = [];
    const MAX_ACTIVITY = 200;
    function logActivity(event: string, data: unknown) {
        activityLog.unshift({ event, data, timestamp: Date.now() });
        if (activityLog.length > MAX_ACTIVITY) activityLog.length = MAX_ACTIVITY;
    }

    // Create Express app
    const app = express();
    app.use(express.json());

    // Serve dashboard UI (before auth so it's publicly accessible)
    const uiDir = path.resolve(__dirname, "../../ui");
    app.use("/ui", express.static(uiDir));
    app.get("/", (_req, res) => {
        res.sendFile(path.join(uiDir, "index.html"));
    });

    // Auth middleware (skips /health and /ui)
    app.use(createAuthMiddleware(gatewayCfg.authToken));

    // ─── Health ────────────────────────────────────────────
    app.get("/health", (_req, res) => {
        const agentState = agent.getState();
        res.json({
            status: "ok",
            uptime: process.uptime(),
            agent: {
                alive: agentState.alive,
                cli: agentState.cli,
                startedAt: agentState.startedAt,
            },
        });
    });

    // ─── Status ────────────────────────────────────────────
    app.get("/api/status", (_req, res) => {
        const agentState = agent.getState();
        res.json({
            agent: agentState,
            sessions: {
                total: sessions.count(),
                active: sessions.activeCount(),
            },
            cron: {
                jobs: cronService.listJobs(),
            },
            gateway: {
                port: gatewayCfg.port,
                wsClients: wsBroadcaster.clientCount(),
            },
        });
    });

    // ─── MCP JSON-RPC ──────────────────────────────────────
    const mcpServer = new MCPServer({
        getHealth: () => ({
            status: "ok",
            uptime: process.uptime(),
            agent: { alive: agent.getState().alive },
        }),
        getStatus: () => ({
            uptime: process.uptime(),
            agent: agent.getState(),
            sessions: { total: sessions.count(), active: sessions.activeCount() },
            cron: { jobs: cronService.listJobs() },
        }),
        listSessions: () => sessions.list().map((s) => ({ id: s.id, status: s.status })),
        createSession: (opts: any) => sessions.create(opts),
        sendChat: async (message: string) => {
            const session = sessions.getOrCreate({});
            const response = await agent.sendMessage(message);
            return { sessionId: session.id, response };
        },
        getAgentStatus: () => agent.getState(),
        listCronJobs: () => cronService.listJobs(),
    });
    app.post("/mcp", mcpServer.expressHandler());

    // ─── Chat ──────────────────────────────────────────────
    app.post("/api/chat", async (req, res) => {
        const { message, sessionId, senderId } = req.body as {
            message?: string;
            sessionId?: string;
            senderId?: string;
        };

        if (!message || typeof message !== "string") {
            res.status(400).json({ error: "message is required" });
            return;
        }

        try {
            // Get or create session
            const session = sessionId
                ? sessions.get(sessionId) ?? sessions.create({ senderId })
                : sessions.getOrCreate({ senderId });

            sessions.addMessage(session.id, {
                role: "user",
                content: message,
                timestamp: Date.now(),
            });

            wsBroadcaster.broadcast("chat:message", {
                sessionId: session.id,
                role: "user",
                preview: message.slice(0, 100),
            });

            const response = await agent.sendMessage(message);

            sessions.addMessage(session.id, {
                role: "assistant",
                content: response,
                timestamp: Date.now(),
            });

            wsBroadcaster.broadcast("chat:response", {
                sessionId: session.id,
                role: "assistant",
                preview: response.slice(0, 100),
            });

            res.json({
                sessionId: session.id,
                response,
            });
        } catch (err) {
            log.error("chat error", { error: formatError(err) });
            res.status(500).json({ error: formatError(err) });
        }
    });

    // ─── Sessions ──────────────────────────────────────────
    app.get("/api/sessions", (_req, res) => {
        const list = sessions.list().map((s) => ({
            id: s.id,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            status: s.status,
            messageCount: s.messages.length,
            senderId: s.senderId,
        }));
        res.json({ sessions: list });
    });

    app.post("/api/sessions", (req, res) => {
        const { senderId, channel } = req.body as {
            senderId?: string;
            channel?: string;
        };
        const session = sessions.create({ senderId, channel });
        res.status(201).json(session);
    });

    app.get("/api/sessions/:id", (req, res) => {
        const session = sessions.get(req.params.id);
        if (!session) {
            res.status(404).json({ error: "session not found" });
            return;
        }
        res.json(session);
    });

    app.delete("/api/sessions/:id", (req, res) => {
        const closed = sessions.close(req.params.id);
        if (!closed) {
            res.status(404).json({ error: "session not found" });
            return;
        }
        res.json({ status: "closed" });
    });

    // ─── Cron ──────────────────────────────────────────────
    app.get("/api/cron/jobs", (_req, res) => {
        res.json({ jobs: cronService.listJobs() });
    });

    app.post("/api/cron/jobs/:id/run", async (req, res) => {
        const jobId = req.params.id;
        const job = cronService.getJob(jobId);
        if (!job) {
            res.status(404).json({ error: "job not found" });
            return;
        }

        try {
            await cronService.runJob(jobId);
            res.json({ status: "completed", job: cronService.getJob(jobId) });
        } catch (err) {
            res.status(500).json({ error: formatError(err) });
        }
    });

    // ─── Agent control ─────────────────────────────────────
    app.post("/api/agent/restart", async (_req, res) => {
        try {
            await agent.restart();
            res.json({ status: "restarted", agent: agent.getState() });
        } catch (err) {
            res.status(500).json({ error: formatError(err) });
        }
    });

    app.get("/api/agent/status", (_req, res) => {
        res.json(agent.getState());
    });

    // ─── Agent terminal output ────────────────────────────
    app.get("/api/agent/terminal", (_req, res) => {
        const state = agent.getState();
        const output = state.alive ? captureSessionOutput(state.sessionName) : "";
        res.json({ output, alive: state.alive });
    });

    // ─── Activity log ─────────────────────────────────────
    app.get("/api/activity", (req, res) => {
        const limitStr = typeof req.query?.limit === "string" ? req.query.limit : "50";
        const limit = Math.min(parseInt(limitStr, 10) || 50, MAX_ACTIVITY);
        res.json({ events: activityLog.slice(0, limit) });
    });

    // ─── Start HTTP + WebSocket ────────────────────────────
    const httpServer = http.createServer(app);
    const wsBroadcaster = createWebSocketServer(httpServer);

    // Initialize cron service
    const cronService = new CronService({
        config: config.cron,
        agent,
        onEvent: (event) => {
            wsBroadcaster.broadcast("cron", event);
        },
    });

    // Start the agent
    await agent.start();

    // Start listening
    await new Promise<void>((resolve) => {
        httpServer.listen(gatewayCfg.port, gatewayCfg.host, () => {
            log.info(`gateway server listening on ${gatewayCfg.host}:${gatewayCfg.port}`);
            resolve();
        });
    });

    return {
        port: gatewayCfg.port,
        agent,
        sessions,
        cron: cronService,
        ws: wsBroadcaster,
        close: async () => {
            log.info("shutting down gateway server");
            cronService.stop();
            agent.stop();
            wsBroadcaster.close();
            await new Promise<void>((resolve, reject) => {
                httpServer.close((err) => (err ? reject(err) : resolve()));
            });
            log.info("gateway server stopped");
        },
    };
}
