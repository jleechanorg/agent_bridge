# Agent Bridge

A universal bridge between messaging platforms and AI coding agents. Route messages from Slack, Discord, Telegram, or webhooks to any CLI agent (Claude, Codex, Gemini, Cursor) running in isolated tmux sessions.

## Architecture

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
open http://localhost:19876
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_TOKEN` | Yes | Bearer token for API auth |
| `SLACK_BOT_TOKEN` | No | Slack bot OAuth token |
| `SLACK_APP_TOKEN` | No | Slack app-level token (socket mode) |
| `GATEWAY_PORT` | No | Server port (default: 19876) |
| `GATEWAY_HOST` | No | Server host (default: 127.0.0.1) |
| `AGENT_CLI` | No | Agent CLI: `claude`, `codex`, `gemini`, `cursor` |
| `AGENT_WORKSPACE` | No | Working directory for the agent |
| `AGENT_MODEL` | No | Model override |

### YAML Config

```yaml
gateway:
  port: 19876
  host: 127.0.0.1

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
| `GET` | `/` | No | Dashboard UI |
| `GET` | `/health` | No | Health check |
| `GET` | `/api/status` | Yes | Agent + gateway status |
| `POST` | `/api/chat` | Yes | Send message to agent |
| `GET` | `/api/sessions` | Yes | List sessions |
| `POST` | `/api/sessions` | Yes | Create session |
| `GET` | `/api/sessions/:id` | Yes | Get session by ID |
| `DELETE` | `/api/sessions/:id` | Yes | Close session |
| `GET` | `/api/cron` | Yes | List cron jobs |
| `POST` | `/api/cron/:name/trigger` | Yes | Trigger cron job |
| `GET` | `/api/agent/terminal` | Yes | Stream terminal output |
| `POST` | `/api/agent/restart` | Yes | Restart agent |
| `WS` | `/ws` | No | WebSocket events |

## Supported Runners

| Runner | CLI | Flags | Use Case |
|--------|-----|-------|----------|
| Claude | `claude` | `--dangerously-skip-permissions` | General coding |
| Codex | `codex` | `--full-auto` | Code generation |
| Gemini | `gemini` | `--model <model>` | Google models |
| Cursor | `cursor` | `--agent` | IDE-integrated |

## Testing

```bash
pnpm test               # All 166 tests
pnpm test:unit           # Unit tests only
pnpm test:e2e            # End-to-end tests
pnpm test:api            # API contract tests
pnpm test:browser        # Dashboard UI tests
```

## Project Structure

```
src/
├── agent/
│   ├── boot-check.ts        # BOOT.md validation
│   ├── bridge.ts             # Tmux session management
│   ├── lifecycle.ts           # Agent lifecycle (start/stop/health)
│   └── runners/
│       ├── types.ts           # Runner interface + BaseRunner
│       ├── claude.ts          # Claude CLI runner
│       ├── codex.ts           # Codex CLI runner
│       ├── gemini.ts          # Gemini CLI runner
│       └── cursor.ts          # Cursor CLI runner
├── channels/
│   ├── types.ts               # Channel interface + router
│   ├── discord.ts             # Discord provider
│   ├── telegram.ts            # Telegram provider
│   ├── webhook.ts             # Generic webhook
│   └── allowlist.ts           # User/channel filtering + rate limit
├── config/
│   ├── loader.ts              # YAML + env config loader
│   ├── types.ts               # Zod schemas
│   └── reloader.ts            # Live config reload
├── gateway/
│   ├── server.ts              # Express HTTP + WebSocket server
│   ├── auth.ts                # Bearer token middleware
│   ├── sessions.ts            # Session store (in-memory)
│   ├── store/sqlite.ts        # SQLite persistent sessions
│   ├── cron.ts                # Cron job scheduler
│   └── websocket.ts           # WebSocket event broadcasting
├── monitoring/
│   └── prometheus.ts          # Counters, gauges, /metrics
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
├── logger-pino.ts             # Pino structured logging
└── entry.ts                   # CLI entry point
ui/
├── index.html                 # Dashboard HTML
├── styles.css                 # Dark-mode glassmorphism CSS
└── dashboard.js               # Real-time WebSocket client
```

## License

MIT
