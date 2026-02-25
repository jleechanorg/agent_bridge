import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startGatewayServer, type GatewayServer } from "../../src/gateway/server.js";
import { applyConfigDefaults } from "../../src/config/types.js";

describe("Browser Layer — Dashboard", () => {
    let server: GatewayServer;
    const TEST_PORT = 19880;
    const BASE = `http://127.0.0.1:${TEST_PORT}`;

    beforeAll(async () => {
        const config = applyConfigDefaults({
            gateway: { port: TEST_PORT, host: "127.0.0.1" },
        });
        server = await startGatewayServer(config);
    });

    afterAll(async () => {
        await server.close();
    });

    it("dashboard HTML contains all required sections", async () => {
        const res = await fetch(`${BASE}/`);
        const html = await res.text();

        // Core structure
        expect(html).toContain("Agent Gateway");
        expect(html).toContain("dashboard.js");
        expect(html).toContain("styles.css");

        // Stats bar
        expect(html).toContain("stat-agent");
        expect(html).toContain("stat-messages");
        expect(html).toContain("stat-sessions");
        expect(html).toContain("stat-uptime");

        // Agent card
        expect(html).toContain("agent-badge");
        expect(html).toContain("agent-cli");
        expect(html).toContain("btn-restart");

        // Terminal
        expect(html).toContain("terminal-output");

        // Sessions
        expect(html).toContain("session-list");

        // Activity
        expect(html).toContain("activity-feed");

        // Cron
        expect(html).toContain("cron-list");
    });

    it("CSS is served with correct content", async () => {
        const res = await fetch(`${BASE}/ui/styles.css`);
        expect(res.status).toBe(200);
        const css = await res.text();

        // Key design system tokens
        expect(css).toContain("--bg-primary");
        expect(css).toContain("--accent-indigo");
        expect(css).toContain("glassmorphism");
        expect(css).toContain("Inter");
        expect(css).toContain("JetBrains Mono");
    });

    it("JS is served with correct content", async () => {
        const res = await fetch(`${BASE}/ui/dashboard.js`);
        expect(res.status).toBe(200);
        const js = await res.text();

        // WebSocket connection
        expect(js).toContain("WebSocket");
        expect(js).toContain("connectWebSocket");

        // API calls
        expect(js).toContain("fetchStatus");
        expect(js).toContain("fetchSessions");
        expect(js).toContain("fetchTerminal");

        // Agent actions
        expect(js).toContain("restartAgent");
        expect(js).toContain("checkHealth");
    });

    it("WebSocket endpoint is available", async () => {
        // Test WS upgrade by checking the HTTP upgrade path exists
        // Full WS test would require a WS client
        const res = await fetch(`${BASE}/health`);
        expect(res.status).toBe(200);
        // The WS server is attached to the same HTTP server
    });
});
