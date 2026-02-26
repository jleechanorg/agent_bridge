# testing_llm/ — Agent Bridge Test Infrastructure

Adapted from:
- [`testing_http/`](file:///Users/jleechan/projects/worldarchitect.ai/testing_http) — HTTP API testing patterns
- [`testing_mcp/`](file:///Users/jleechan/projects/worldarchitect.ai/testing_mcp) — MCP protocol testing patterns

## Structure

```
testing_llm/
├── test_config.ts          # BASE_URL, auth, server wait
├── lib/
│   ├── gateway-client.ts   # HTTP client (from testing_http patterns)
│   ├── mcp-client.ts       # JSON-RPC client (from mcp_client.py)
│   └── evidence.ts         # Evidence capture (from evidence_utils.py)
├── test_health_smoke.ts    # Smoke tests against live server
└── run_all.sh              # Start server + run all tests
```

## Running

```bash
# Start server and run all tests
bash testing_llm/run_all.sh

# Or run individual test against running server
AUTH_TOKEN=e2e-test-token-12345 npx tsx testing_llm/test_health_smoke.ts
```

## Evidence

Results saved to `/tmp/agent-bridge-evidence/<test>/<date>/evidence.json`
