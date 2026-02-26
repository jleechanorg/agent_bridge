#!/usr/bin/env npx tsx
/**
 * Smoke test — adapted from testing_mcp/test_smoke.py
 * Validates core gateway functionality against a live server.
 *
 * VIDEO-FRIENDLY: Uses ASCII-only markers (PASS/FAIL, not emoji)
 * and 1.5s pauses between groups so agg/asciinema captures progression.
 */

import { GatewayClient } from "./lib/gateway-client.js";
import { MCPClient } from "./lib/mcp-client.js";
import { EvidenceCapture, type TestResult } from "./lib/evidence.js";
import { BASE_URL, waitForServer } from "./test_config.js";

const PAUSE_MS = 1500; // pause between groups for video capture
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function mark(ok: boolean): string { return ok ? "[PASS]" : "[FAIL]"; }

async function runSmoke(): Promise<void> {
    console.log("");
    console.log("=".repeat(60));
    console.log("  Agent Bridge -- Smoke Tests (testing_llm)");
    console.log(`  Server: ${BASE_URL}`);
    console.log(`  ${new Date().toISOString()}`);
    console.log("=".repeat(60));

    const evidence = new EvidenceCapture("smoke");
    const gw = new GatewayClient();
    const mcp = new MCPClient();

    // Wait for server
    console.log("");
    console.log("  Waiting for server...");
    const alive = await waitForServer(5000);
    if (!alive) { console.log("  [FAIL] Server not available"); process.exit(1); }
    console.log("  [PASS] Server ready");
    await sleep(PAUSE_MS);

    // ── 1. Health ──────────────────────────────────────────
    console.log("");
    console.log("--- 1. Health Endpoint ---");
    const health = await gw.get("/health");
    const healthOk = health.status === 200 && health.body?.status === "ok";
    evidence.addResult({
        name: "health_endpoint",
        passed: healthOk,
        errors: healthOk ? [] : [`status ${health.status}`],
        evidence: { status: health.status, body: health.body },
    });
    console.log(`  ${mark(health.status === 200)} GET /health returns ${health.status}`);
    console.log(`  ${mark(health.body?.status === "ok")} Body contains status:ok`);
    console.log(`  ${mark(health.body?.agent?.alive)} Agent is alive`);
    await sleep(PAUSE_MS);

    // ── 2. Auth Enforcement ────────────────────────────────
    console.log("");
    console.log("--- 2. Auth Enforcement ---");
    const noAuth = await fetch(`${BASE_URL}/api/status`);
    const badAuth = await fetch(`${BASE_URL}/api/status`, { headers: { Authorization: "Bearer wrong" } });
    const goodAuth = await gw.get("/api/status");
    const authOk = noAuth.status === 401 && badAuth.status === 403 && goodAuth.status === 200;
    evidence.addResult({
        name: "auth_enforcement",
        passed: authOk,
        errors: [
            noAuth.status !== 401 ? `no-auth: ${noAuth.status}` : "",
            badAuth.status !== 403 ? `bad-auth: ${badAuth.status}` : "",
            goodAuth.status !== 200 ? `valid-auth: ${goodAuth.status}` : "",
        ].filter(Boolean),
        evidence: { noAuth: noAuth.status, badAuth: badAuth.status, goodAuth: goodAuth.status },
    });
    console.log(`  ${mark(noAuth.status === 401)} No token -> ${noAuth.status}`);
    console.log(`  ${mark(badAuth.status === 403)} Bad token -> ${badAuth.status}`);
    console.log(`  ${mark(goodAuth.status === 200)} Valid token -> ${goodAuth.status}`);
    await sleep(PAUSE_MS);

    // ── 3. Session CRUD ────────────────────────────────────
    console.log("");
    console.log("--- 3. Session CRUD ---");
    const created = await gw.post("/api/sessions", { senderId: "smoke-user", channel: "test" });
    const sessionId = created.body?.id;
    const got = sessionId ? await gw.get(`/api/sessions/${sessionId}`) : { status: 0, body: null };
    const listed = await gw.get("/api/sessions");
    const deleted = sessionId ? await gw.del(`/api/sessions/${sessionId}`) : { status: 0, body: null };
    const crudOk = created.status === 201 && got.status === 200 && deleted.status === 200;
    evidence.addResult({
        name: "session_crud",
        passed: crudOk,
        errors: [
            created.status !== 201 ? `create: ${created.status}` : "",
            got.status !== 200 ? `get: ${got.status}` : "",
            deleted.status !== 200 ? `delete: ${deleted.status}` : "",
        ].filter(Boolean),
        evidence: { sessionId, created: created.status, got: got.status, deleted: deleted.status },
    });
    console.log(`  ${mark(created.status === 201)} Create -> ${created.status}`);
    console.log(`    Session: ${sessionId}`);
    console.log(`  ${mark(got.status === 200)} GET by ID -> ${got.status}`);
    console.log(`  ${mark(deleted.status === 200)} DELETE -> ${deleted.status}`);
    await sleep(PAUSE_MS);

    // ── 4. Agent Status ────────────────────────────────────
    console.log("");
    console.log("--- 4. Agent Status ---");
    const agentStatus = await gw.get("/api/agent/status");
    const agentOk = agentStatus.status === 200 && agentStatus.body?.alive === true;
    evidence.addResult({
        name: "agent_status",
        passed: agentOk,
        errors: agentOk ? [] : ["agent not alive"],
        evidence: { status: agentStatus.status, body: agentStatus.body },
    });
    console.log(`  ${mark(agentStatus.body?.alive)} Agent alive: ${agentStatus.body?.alive}`);
    console.log(`  ${mark(agentStatus.body?.sessionName)} Session: ${agentStatus.body?.sessionName}`);
    await sleep(PAUSE_MS);

    // ── 5. Error Handling ──────────────────────────────────
    console.log("");
    console.log("--- 5. Error Handling ---");
    const notFound = await gw.get("/api/sessions/nonexistent-id");
    const badChat = await gw.post("/api/chat", {});
    const errOk = notFound.status === 404 && badChat.status === 400;
    evidence.addResult({
        name: "error_handling",
        passed: errOk,
        errors: [
            notFound.status !== 404 ? `missing session: ${notFound.status}` : "",
            badChat.status !== 400 ? `bad chat: ${badChat.status}` : "",
        ].filter(Boolean),
        evidence: { notFound: notFound.status, badChat: badChat.status },
    });
    console.log(`  ${mark(notFound.status === 404)} Missing session -> ${notFound.status}`);
    console.log(`  ${mark(badChat.status === 400)} Bad chat body -> ${badChat.status}`);
    await sleep(PAUSE_MS);

    // ── 6. MCP Protocol ────────────────────────────────────
    console.log("");
    console.log("--- 6. MCP Protocol ---");
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
        console.log(`  ${mark(hasTools)} tools/list -> ${tools.length} tools`);
        console.log(`    Tools: ${toolNames.join(", ")}`);

        const healthTool = await mcp.toolsCall("gateway_health");
        evidence.addResult({
            name: "mcp_gateway_health",
            passed: healthTool?.status === "ok",
            errors: healthTool?.status !== "ok" ? ["health not ok"] : [],
            evidence: { health: healthTool },
        });
        console.log(`  ${mark(healthTool?.status === "ok")} gateway_health -> ${healthTool?.status}`);

        const statusTool = await mcp.toolsCall("gateway_status");
        const hasUptime = typeof statusTool?.uptime === "number";
        evidence.addResult({
            name: "mcp_gateway_status",
            passed: hasUptime,
            errors: hasUptime ? [] : ["no uptime in status"],
            evidence: { status: statusTool },
        });
        console.log(`  ${mark(hasUptime)} gateway_status -> uptime: ${statusTool?.uptime?.toFixed(1)}s`);
    } catch (e: any) {
        evidence.addResult({
            name: "mcp_protocol",
            passed: false,
            errors: [e.message],
            evidence: {},
        });
        console.log(`  [FAIL] MCP error: ${e.message}`);
    }
    await sleep(PAUSE_MS);

    // ── Summary ────────────────────────────────────────────
    const evidencePath = evidence.save();

    const passed = evidence["results"].filter((r: any) => r.passed).length;
    const failed = evidence["results"].filter((r: any) => !r.passed).length;
    const total = evidence["results"].length;

    console.log("");
    console.log("=".repeat(60));
    console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${total} total`);
    if (failed === 0) {
        console.log("  ALL TESTS PASSED");
    } else {
        console.log(`  ${failed} TESTS FAILED`);
    }
    console.log("=".repeat(60));
    console.log("");
    for (const r of evidence["results"]) {
        console.log(`  ${mark(r.passed)} ${r.name}`);
        if (!r.passed && r.errors.length) {
            for (const e of r.errors) console.log(`       -> ${e}`);
        }
    }
    console.log("");
    console.log(`  Evidence: ${evidencePath}`);
    console.log("");
}

runSmoke().catch((e) => { console.error(e); process.exit(1); });
