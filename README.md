# Agent Bridge

A multi-channel AI gateway with CLI agent orchestration. Route messages from Slack to any CLI agent (Claude, Codex, Gemini, Cursor) running in isolated tmux sessions.

**Stats:** ~8.6K lines · ~107 source files · ~38 test files

## Feature Status

| Category | Status | Notes |
|----------|--------|-------|
| **Gateway API** | Real | All endpoints wired in `src/gateway/server.ts` |
| **Slack Integration** | Real | Full implementation in `src/slack/provider.ts` |
| **Claude Runner** | Real | `--dangerously-skip-permissions` flag |
| **Codex Runner** | Real | `--full-auto` flag |
| **Gemini Runner** | Partial | Class exists but not wired in runtime |
| **Cursor Runner** | Partial | Class exists but not wired in runtime |
| **Discord Channel** | Stub | Empty implementation, no actual connection |
| **Telegram Channel** | Stub | Empty implementation, no actual connection |
| **Webhook Channel** | Stub | Empty implementation, no actual connection |
| **SQLite Sessions** | Not done | In-memory store is default; SQLite file exists but unused |
| **Prometheus `/metrics`** | Not done | Metrics class exists but no HTTP route mounted |
| **WebSocket `/ws`** | Real | Wired in `src/gateway/websocket.ts` |
| **Dashboard `/`** | Real | UI served at `/ui`, redirect at `/` |

## Architecture (Target State)

> The diagram below shows the intended full architecture. Not all components are currently implemented. See [Feature Status](#feature-status) for what is actually running.

```
                        ┌─────────────────────────────────────────────────┐
                        │                 Agent Bridge                     │
                        │                                                 │
  ┌──────────┐          │  ┌──────────────┐     ┌──────────────────────┐  │
  │  Slack   │──────────┼─▶│              │     │    Runner Factory     │  │
  ├──────────┤          │  │   Channel    │     │  ┌────────────────┐  │  │
  │ Discord  │──────────┼─▶│   Router     │────▶│  │ ClaudeRunner   │──┼──┼──▶ tmux session
  ├──────────┤          │  │              │     │  │ CodexRunner    │──┼──┼──▶ tmux session
  │ Telegram │──────────┼─▶│  Allowlist   │     │  │ GeminiRunner   │──┼──┼──▶ tmux session
  ├──────────┤          │  │  Rate Limit  │     │  │ CursorRunner   │──┼──┼──▶ tmux session
  │ Webhook  │──────────┼─▶│              │     │  └────────────────┘  │  │
  └──────────┘          │  └──────┬───────┘     └──────────────────────┘  │
                        │         │                                       │
                        │         ▼                                       │
                        │  ┌──────────────┐     ┌──────────────────────┐  │
                        │  │   Plugin     │     │    Orchestration      │  │
                        │  │   Manager    │     │  ┌────────────────┐  │  │
                        │  │              │     │  │ Agent Registry │  │  │
       ┌────────┐       │  │  onMessage   │     │  │ Session Keys   │  │  │
       │  HTTP  │◀──────┼──│  onResponse  │     │  │ Wake/Sleep     │  │  │
       │  API   │       │  │  onCron      │     │  └────────────────┘  │  │
       ├────────┤       │  └──────────────┘     └──────────────────────┘  │
       │ WebSocket│     │                                                 │
       ├────────┤       │  ┌──────────────┐     ┌──────────────────────┐  │
       │Dashboard│      │  │  SQLite      │     │    Monitoring         │  │
       └────────┘       │  │  Sessions    │     │  Prometheus /metrics  │  │
                        │  │  + Pino Log  │     │  Config Reloader      │  │
                        │  └──────────────┘     └──────────────────────┘  │
                        └─────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Clone
git clone https://github.com/jleechanorg/agent_bridge.git
cd agent_bridge

# Install
pnpm install

# Configure
cp .env.example .env
# Edit .env with your tokens

# Run
pnpm start

# Dashboard
open http://localhost:18789
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AUTH_TOKEN` | No | (none) | Bearer token for API auth (optional - API is open if unset) |
| `SLACK_BOT_TOKEN` | No | (none) | Slack bot OAuth token |
| `SLACK_APP_TOKEN` | No | (none) | Slack app-level token (socket mode) |
| `GATEWAY_PORT` | No | 18789 | Server port |
| `GATEWAY_HOST` | No | 0.0.0.0 | Server host |
| `AGENT_CLI` | No | claude | Agent CLI: only `claude` and `codex` are wired |
| `AGENT_WORKSPACE` | No | . | Working directory for the agent |
| `AGENT_MODEL` | No | (none) | Model override |

### YAML Config

```yaml
gateway:
  port: 18789
  host: 0.0.0.0

agent:
  cli: claude
  workspace: /path/to/project
  model: sonnet

slack:
  bot_token: xoxb-...
  app_token: xapp-...

cron:
  jobs:
    - name: health-check
      schedule: "*/5 * * * *"
      message: "Run health checks"
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | No | Dashboard UI (redirects to /ui) |
| `GET` | `/health` | No | Health check |
| `GET` | `/ui/*` | No | Static dashboard assets |
| `GET` | `/api/status` | Yes | Agent + gateway status |
| `POST` | `/api/chat` | Yes | Send message to agent |
| `GET` | `/api/sessions` | Yes | List sessions |
| `POST` | `/api/sessions` | Yes | Create session |
| `GET` | `/api/sessions/:id` | Yes | Get session by ID |
| `DELETE` | `/api/sessions/:id` | Yes | Close session |
| `GET` | `/api/cron/jobs` | Yes | List cron jobs |
| `POST` | `/api/cron/jobs/:id/run` | Yes | Trigger cron job |
| `GET` | `/api/agent/status` | Yes | Get agent status |
| `GET` | `/api/agent/terminal` | Yes | Stream terminal output |
| `POST` | `/api/agent/restart` | Yes | Restart agent |
| `GET` | `/api/activity` | Yes | Activity log events |
| `POST` | `/mcp` | Yes | MCP JSON-RPC endpoint |
| `WS` | `/ws` | No | WebSocket events |

## Supported Runners

| Runner | CLI | Flags | Runtime Status |
|--------|-----|-------|-----------------|
| Claude | `claude` | `--dangerously-skip-permissions` | Implemented |
| Codex | `codex` | `--full-auto` | Implemented |
| Gemini | `gemini` | `--model <model>` | Stub (class exists, not wired) |
| Cursor | `cursor` | `--agent` | Stub (class exists, not wired) |

## Testing

```bash
pnpm test               # Run all tests
pnpm test:unit          # Unit tests only
pnpm test:e2e           # End-to-end tests
pnpm test:api           # API contract tests
pnpm test:browser       # Dashboard UI tests
```

## Project Structure

```
src/
├── agent/
│   ├── boot-check.ts        # BOOT.md validation
│   ├── bridge.ts             # Tmux session management (claude/codex only)
│   ├── lifecycle.ts           # Agent lifecycle (start/stop/health)
│   └── runners/
│       ├── types.ts           # Runner interface + BaseRunner
│       ├── claude.ts          # Claude CLI runner
│       ├── codex.ts           # Codex CLI runner
│       ├── gemini.ts          # Gemini CLI runner (stub)
│       └── cursor.ts          # Cursor CLI runner (stub)
├── channels/
│   ├── types.ts               # Channel interface + router
│   ├── discord.ts             # Discord provider (stub)
│   ├── telegram.ts            # Telegram provider (stub)
│   ├── webhook.ts             # Generic webhook (stub)
│   └── allowlist.ts           # User/channel filtering + rate limit
├── config/
│   ├── loader.ts              # YAML + env config loader
│   ├── types.ts               # Zod schemas
│   └── reloader.ts            # Live config reload
├── gateway/
│   ├── server.ts              # Express HTTP + WebSocket server
│   ├── auth.ts                # Bearer token middleware
│   ├── sessions.ts            # Session store (in-memory, default)
│   ├── store/sqlite.ts        # SQLite persistent sessions (not wired)
│   ├── cron.ts                # Cron job scheduler
│   ├── websocket.ts           # WebSocket event broadcasting
│   └── mcp-server.ts          # MCP JSON-RPC handler
├── monitoring/
│   └── prometheus.ts          # Metrics utilities (no /metrics route)
├── orchestration/
│   ├── registry.ts            # Multi-agent registry
│   ├── session-keys.ts        # Canonical keys + aliases
│   └── wake-sleep.ts          # Idle detection + auto-sleep
├── plugins/
│   └── types.ts               # Plugin lifecycle hooks + manager
├── slack/
│   ├── provider.ts            # @slack/bolt integration
│   └── handler.ts             # Message chunking + threading
├── errors.ts                  # Typed error hierarchy
├── logger.ts                 # Structured logging
├── logger-pino.ts            # Pino structured logging (alternate)
└── entry.ts                   # CLI entry point
ui/
├── index.html                 # Dashboard HTML
├── styles.css                 # Dark-mode glassmorphism CSS
└── dashboard.js               # Real-time WebSocket client
```

## License

MIT
