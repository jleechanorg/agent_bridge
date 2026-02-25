import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startGatewayServer, type GatewayServer } from "../../src/gateway/server.js";
import { applyConfigDefaults } from "../../src/config/types.js";

describe("API Layer — Sessions CRUD", () => {
    let server: GatewayServer;
    const TEST_PORT = 19879;
    const BASE = `http://127.0.0.1:${TEST_PORT}`;
    const headers = { "Content-Type": "application/json" };

    beforeAll(async () => {
        const config = applyConfigDefaults({
            gateway: { port: TEST_PORT, host: "127.0.0.1" },
        });
        server = await startGatewayServer(config);
    });

    afterAll(async () => {
        await server.close();
    });

    it("full session lifecycle: create → get → list → close → verify", async () => {
        // 1. Create
        const createRes = await fetch(`${BASE}/api/sessions`, {
            method: "POST",
            headers,
            body: JSON.stringify({ senderId: "lifecycle-user", channel: "C001" }),
        });
        expect(createRes.status).toBe(201);
        const session = await createRes.json();
        expect(session.id).toBeTruthy();
        expect(session.senderId).toBe("lifecycle-user");
        expect(session.channel).toBe("C001");
        expect(session.status).toBe("active");
        expect(session.messages).toHaveLength(0);

        // 2. Get
        const getRes = await fetch(`${BASE}/api/sessions/${session.id}`);
        expect(getRes.status).toBe(200);
        const retrieved = await getRes.json();
        expect(retrieved.id).toBe(session.id);

        // 3. List
        const listRes = await fetch(`${BASE}/api/sessions`);
        expect(listRes.status).toBe(200);
        const list = await listRes.json();
        const found = list.sessions.find((s: { id: string }) => s.id === session.id);
        expect(found).toBeDefined();
        expect(found.messageCount).toBe(0);

        // 4. Close
        const closeRes = await fetch(`${BASE}/api/sessions/${session.id}`, {
            method: "DELETE",
        });
        expect(closeRes.status).toBe(200);

        // 5. Verify closed
        const verifyRes = await fetch(`${BASE}/api/sessions/${session.id}`);
        const closed = await verifyRes.json();
        expect(closed.status).toBe("closed");
    });

    it("multiple sessions have unique IDs", async () => {
        const ids: string[] = [];
        for (let i = 0; i < 5; i++) {
            const res = await fetch(`${BASE}/api/sessions`, {
                method: "POST",
                headers,
                body: JSON.stringify({}),
            });
            const data = await res.json();
            ids.push(data.id);
        }

        const unique = new Set(ids);
        expect(unique.size).toBe(5);
    });
});
