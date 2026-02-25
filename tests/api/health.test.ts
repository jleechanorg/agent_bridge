import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startGatewayServer, type GatewayServer } from "../../src/gateway/server.js";
import { applyConfigDefaults } from "../../src/config/types.js";

describe("API Layer — Health & Status", () => {
    let server: GatewayServer;
    const TEST_PORT = 19878;
    const BASE = `http://127.0.0.1:${TEST_PORT}`;

    beforeAll(async () => {
        const config = applyConfigDefaults({
            gateway: {
                port: TEST_PORT,
                host: "127.0.0.1",
                authToken: "test-api-token",
            },
        });
        server = await startGatewayServer(config);
    });

    afterAll(async () => {
        await server.close();
    });

    it("health endpoint returns correct schema", async () => {
        const res = await fetch(`${BASE}/health`);
        expect(res.status).toBe(200);
        const data = await res.json();

        // Validate schema
        expect(data).toHaveProperty("status", "ok");
        expect(data).toHaveProperty("uptime");
        expect(typeof data.uptime).toBe("number");
        expect(data).toHaveProperty("agent");
        expect(data.agent).toHaveProperty("alive");
        expect(data.agent).toHaveProperty("cli");
    });

    it("status endpoint requires auth", async () => {
        const res = await fetch(`${BASE}/api/status`);
        expect(res.status).toBe(401);
    });

    it("status endpoint accessible with valid token", async () => {
        const res = await fetch(`${BASE}/api/status`, {
            headers: { Authorization: "Bearer test-api-token" },
        });
        expect(res.status).toBe(200);
        const data = await res.json();

        expect(data.agent).toBeDefined();
        expect(data.sessions).toBeDefined();
        expect(data.sessions).toHaveProperty("total");
        expect(data.sessions).toHaveProperty("active");
        expect(data.cron).toBeDefined();
        expect(data.gateway).toBeDefined();
        expect(data.gateway).toHaveProperty("port", TEST_PORT);
    });

    it("agent/terminal endpoint returns output field", async () => {
        const res = await fetch(`${BASE}/api/agent/terminal`, {
            headers: { Authorization: "Bearer test-api-token" },
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty("output");
        expect(data).toHaveProperty("alive");
        expect(typeof data.output).toBe("string");
    });

    it("activity endpoint returns events array", async () => {
        const res = await fetch(`${BASE}/api/activity`, {
            headers: { Authorization: "Bearer test-api-token" },
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty("events");
        expect(Array.isArray(data.events)).toBe(true);
    });

    it("auth rejects wrong token", async () => {
        const res = await fetch(`${BASE}/api/status`, {
            headers: { Authorization: "Bearer wrong-token" },
        });
        expect(res.status).toBe(403);
    });

    it("dashboard is accessible without auth", async () => {
        const res = await fetch(`${BASE}/`);
        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toContain("text/html");
    });
});
