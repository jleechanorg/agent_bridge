import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startGatewayServer, type GatewayServer } from "../../src/gateway/server.js";
import { applyConfigDefaults } from "../../src/config/types.js";

describe("Gateway Boot — E2E", () => {
    let server: GatewayServer;
    const TEST_PORT = 19876;

    beforeAll(async () => {
        const config = applyConfigDefaults({
            gateway: { port: TEST_PORT, host: "127.0.0.1" },
            // No real agent — sessions will work but agent will be offline
        });

        server = await startGatewayServer(config);
    });

    afterAll(async () => {
        await server.close();
    });

    it("should respond to /health", async () => {
        const res = await fetch(`http://127.0.0.1:${TEST_PORT}/health`);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.status).toBe("ok");
        expect(data.uptime).toBeGreaterThan(0);
    });

    it("should respond to /api/status", async () => {
        const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/status`);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.agent).toBeDefined();
        expect(data.sessions).toBeDefined();
        expect(data.cron).toBeDefined();
        expect(data.gateway).toBeDefined();
    });

    it("should serve the dashboard at /", async () => {
        const res = await fetch(`http://127.0.0.1:${TEST_PORT}/`);
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain("Agent Gateway");
        expect(html).toContain("dashboard.js");
    });

    it("should serve UI static assets", async () => {
        const res = await fetch(`http://127.0.0.1:${TEST_PORT}/ui/styles.css`);
        expect(res.status).toBe(200);
        const css = await res.text();
        expect(css).toContain("--bg-primary");
    });

    it("should list empty sessions", async () => {
        const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/sessions`);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.sessions).toEqual([]);
    });

    it("should list cron jobs (empty)", async () => {
        const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/cron/jobs`);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.jobs).toEqual([]);
    });

    it("should return agent terminal (may be empty)", async () => {
        const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/agent/terminal`);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(typeof data.output).toBe("string");
    });

    it("should return agent status", async () => {
        const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/agent/status`);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.cli).toBeDefined();
        expect(data.sessionName).toBeDefined();
    });
});
