#!/usr/bin/env npx tsx
/**
 * Smoke test — adapted from testing_mcp/test_smoke.py
 * Validates core gateway functionality against a live server.
 */

import { GatewayClient } from "./lib/gateway-client.js";
import { MCPClient } from "./lib/mcp-client.js";
import { EvidenceCapture, type TestResult } from "./lib/evidence.js";
import { BASE_URL, waitForServer } from "./test_config.js";

async function runSmoke(): Promise<void> {
    console.log("═".repeat(50));
    console.log("  Agent Bridge — Smoke Tests (testing_llm)");
    console.log(`  Server: ${BASE_URL}`);
    console.log(`  ${new Date().toLocaleString()}`);
    console.log("═".repeat(50));

    const evidence = new EvidenceCapture("smoke");
    const gw = new GatewayClient();
    const mcp = new MCPClient();

    // Wait for server
    console.log("\n⏳ Waiting for server...");
    const alive = await waitForServer(5000);
    if (!alive) { console.log("❌ Server not available"); process.exit(1); }
    console.log("✅ Server ready\n");

    // 1. Health
    console.log("━━━ 1. Health ━━━");
    const health = await gw.get("/health");
    evidence.addResult({
        name: "health_endpoint",
        passed: health.status === 200 && health.body?.status === "ok",
        errors: health.status !== 200 ? [`status ${health.status}`] : [],
        evidence: { status: health.status, body: health.body },
    });
    console.log(`  ${health.status === 200 ? "✅" : "❌"} GET /health → ${health.status}`);

    // 2. Auth enforcement
    console.log("\n━━━ 2. Auth ━━━");
    const noAuth = await fetch(`${BASE_URL}/api/status`);
    const badAuth = await fetch(`${BASE_URL}/api/status`, { headers: { Authorization: "Bearer wrong" } });
    const goodAuth = await gw.get("/api/status");
    evidence.addResult({
        name: "auth_enforcement",
        passed: noAuth.status === 401 && badAuth.status === 403 && goodAuth.status === 200,
        errors: [
            noAuth.status !== 401 ? `no-auth: ${noAuth.status}` : "",
            badAuth.status !== 403 ? `bad-auth: ${badAuth.status}` : "",
            goodAuth.status !== 200 ? `valid-auth: ${goodAuth.status}` : "",
        ].filter(Boolean),
        evidence: { noAuth: noAuth.status, badAuth: badAuth.status, goodAuth: goodAuth.status },
    });
    console.log(`  ${noAuth.status === 401 ? "✅" : "❌"} No token → ${noAuth.status}`);
    console.log(`  ${badAuth.status === 403 ? "✅" : "❌"} Bad token → ${badAuth.status}`);
    console.log(`  ${goodAuth.status === 200 ? "✅" : "❌"} Valid token → ${goodAuth.status}`);

    // 3. Session CRUD
    console.log("\n━━━ 3. Session CRUD ━━━");
    const created = await gw.post("/api/sessions", { senderId: "smoke-user", channel: "test" });
    const sessionId = created.body?.id;
    const got = sessionId ? await gw.get(`/api/sessions/${sessionId}`) : { status: 0, body: null };
    const listed = await gw.get("/api/sessions");
    const deleted = sessionId ? await gw.del(`/api/sessions/${sessionId}`) : { status: 0, body: null };
    evidence.addResult({
        name: "session_crud",
        passed: created.status === 201 && got.status === 200 && deleted.status === 200,
        errors: [
            created.status !== 201 ? `create: ${created.status}` : "",
            got.status !== 200 ? `get: ${got.status}` : "",
            deleted.status !== 200 ? `delete: ${deleted.status}` : "",
        ].filter(Boolean),
        evidence: { sessionId, created: created.status, got: got.status, deleted: deleted.status },
    });
    console.log(`  ${created.status === 201 ? "✅" : "❌"} Create → ${created.status} (${sessionId})`);
    console.log(`  ${got.status === 200 ? "✅" : "❌"} Get → ${got.status}`);
    console.log(`  ${deleted.status === 200 ? "✅" : "❌"} Delete → ${deleted.status}`);

    // 4. Agent status
    console.log("\n━━━ 4. Agent ━━━");
    const agentStatus = await gw.get("/api/agent/status");
    evidence.addResult({
        name: "agent_status",
        passed: agentStatus.status === 200 && agentStatus.body?.alive === true,
        errors: agentStatus.body?.alive !== true ? ["agent not alive"] : [],
        evidence: { status: agentStatus.status, body: agentStatus.body },
    });
    console.log(`  ${agentStatus.body?.alive ? "✅" : "❌"} Agent alive: ${agentStatus.body?.alive}`);

    // 5. Error handling
    console.log("\n━━━ 5. Errors ━━━");
    const notFound = await gw.get("/api/sessions/nonexistent-id");
    const badChat = await gw.post("/api/chat", {});
    evidence.addResult({
        name: "error_handling",
        passed: notFound.status === 404 && badChat.status === 400,
        errors: [
            notFound.status !== 404 ? `missing session: ${notFound.status}` : "",
            badChat.status !== 400 ? `bad chat: ${badChat.status}` : "",
        ].filter(Boolean),
        evidence: { notFound: notFound.status, badChat: badChat.status },
    });
    console.log(`  ${notFound.status === 404 ? "✅" : "❌"} Missing session → ${notFound.status}`);
    console.log(`  ${badChat.status === 400 ? "✅" : "❌"} Bad chat → ${badChat.status}`);

    // 6. MCP Protocol (if /mcp endpoint exists)
    console.log("\n━━━ 6. MCP Protocol ━━━");
    try {
        const tools = await mcp.toolsList();
        const hasTools = tools.length > 0;
        const toolNames = tools.map((t: any) => t.name);
        evidence.addResult({
            name: "mcp_tools_list",
            passed: hasTools,
            errors: hasTools ? [] : ["no tools returned"],
            evidence: { toolCount: tools.length, toolNames },
        });
        console.log(`  ${hasTools ? "✅" : "❌"} tools/list → ${tools.length} tools`);

        const healthTool = await mcp.toolsCall("gateway_health");
        evidence.addResult({
            name: "mcp_gateway_health",
            passed: healthTool?.status === "ok",
            errors: healthTool?.status !== "ok" ? ["health not ok"] : [],
            evidence: { health: healthTool },
        });
        console.log(`  ${healthTool?.status === "ok" ? "✅" : "❌"} gateway_health → ${healthTool?.status}`);
    } catch (e: any) {
        evidence.addResult({
            name: "mcp_protocol",
            passed: false,
            errors: [e.message],
            evidence: {},
        });
        console.log(`  ❌ MCP: ${e.message}`);
    }

    // Save and print
    const evidencePath = evidence.save();
    evidence.printSummary();
    console.log(`\n📄 Evidence saved: ${evidencePath}`);
}

runSmoke().catch((e) => { console.error(e); process.exit(1); });
