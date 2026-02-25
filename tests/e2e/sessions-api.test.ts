import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startGatewayServer, type GatewayServer } from "../../src/gateway/server.js";
import { applyConfigDefaults } from "../../src/config/types.js";

describe("Sessions API — E2E", () => {
    let server: GatewayServer;
    const TEST_PORT = 19877;
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

    it("should create a session via POST", async () => {
        const res = await fetch(`${BASE}/api/sessions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ senderId: "test-user" }),
        });
        expect(res.status).toBe(201);
        const session = await res.json();
        expect(session.id).toMatch(/^session-/);
        expect(session.senderId).toBe("test-user");
        expect(session.status).toBe("active");
    });

    it("should list sessions after creation", async () => {
        const res = await fetch(`${BASE}/api/sessions`);
        const data = await res.json();
        expect(data.sessions.length).toBeGreaterThan(0);
        expect(data.sessions[0].senderId).toBe("test-user");
    });

    it("should get a session by ID", async () => {
        // Create one
        const createRes = await fetch(`${BASE}/api/sessions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ senderId: "get-test" }),
        });
        const created = await createRes.json();

        // Get it
        const getRes = await fetch(`${BASE}/api/sessions/${created.id}`);
        expect(getRes.status).toBe(200);
        const retrieved = await getRes.json();
        expect(retrieved.id).toBe(created.id);
    });

    it("should return 404 for unknown session", async () => {
        const res = await fetch(`${BASE}/api/sessions/nonexistent-id`);
        expect(res.status).toBe(404);
    });

    it("should close a session via DELETE", async () => {
        // Create one
        const createRes = await fetch(`${BASE}/api/sessions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ senderId: "close-test" }),
        });
        const created = await createRes.json();

        // Close it
        const deleteRes = await fetch(`${BASE}/api/sessions/${created.id}`, {
            method: "DELETE",
        });
        expect(deleteRes.status).toBe(200);
        const result = await deleteRes.json();
        expect(result.status).toBe("closed");

        // Verify it's closed
        const getRes = await fetch(`${BASE}/api/sessions/${created.id}`);
        const session = await getRes.json();
        expect(session.status).toBe("closed");
    });

    it("should return 404 when closing unknown session", async () => {
        const res = await fetch(`${BASE}/api/sessions/nonexistent`, {
            method: "DELETE",
        });
        expect(res.status).toBe(404);
    });
});
