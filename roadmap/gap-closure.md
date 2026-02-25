# Agent Bridge — Gap Closure Roadmap

Systematic plan to reach feature parity with the reference orchestration platform.

---

## Phase 1: Foundation Hardening (1–2 weeks)

### 1.1 Session Persistence
**Gap**: Sessions are in-memory, lost on restart.
- Replace `SessionStore` with file-backed SQLite store
- Add session replay: reload conversation history on restart
- Support session branching (fork a session for experimentation)
- Session archival and cleanup (TTL-based expiry)

**Files**: `src/gateway/sessions.ts` → `src/gateway/store/sqlite.ts`

### 1.2 Structured Logging
**Gap**: Console logger is not production-grade.
- Replace `src/logger.ts` with `pino`-based structured logging
- JSON output mode for production, pretty-print for development
- Per-subsystem log levels, request ID correlation
- Log rotation and file output

### 1.3 Error Handling & Safety
**Gap**: Basic try/catch, no SSRF guards.
- Create typed error hierarchy (`AgentError`, `ConfigError`, `AuthError`)
- Add SSRF guards on outbound requests
- Graceful degradation: partial failures don't crash the gateway
- Structured error responses with error codes

### 1.4 Boot Check
**Gap**: No validation on first start.
- Read `BOOT.md` from workspace on first launch
- Run agent validation prompt to confirm agent is responsive
- Fail fast with clear diagnostics if agent can't start

---

## Phase 2: Multi-Model Support (1–2 weeks)

### 2.1 Runner Architecture
**Gap**: Only Claude + Codex, hardcoded in bridge.
- Create `Runner` interface: `start()`, `send()`, `capture()`, `stop()`
- Implement dedicated runners:
  - `ClaudeRunner` — `claude --dangerously-skip-permissions`
  - `CodexRunner` — `codex --full-auto`
  - `GeminiRunner` — `gemini-cli` equivalent
  - `CursorRunner` — headless Cursor agent
- Runner factory: config-driven selection
- Per-runner quirks (output parsing, prompt format, flags)

**Files**: `src/agent/runners/claude.ts`, `codex.ts`, `gemini.ts`, `cursor.ts`

### 2.2 Model-Specific Tuning
- Per-model prompt templates
- Per-model output parsing (strip ANSI, detect completion markers)
- Per-model timeout/polling calibration
- Health check tailored to each CLI's conventions

---

## Phase 3: Multi-Channel Support (1–2 weeks)

### 3.1 Channel Abstraction
**Gap**: Slack only.
- Create `Channel` interface: `start()`, `onMessage()`, `sendReply()`
- Implement channel providers:
  - `SlackChannel` — existing code, refactored
  - `DiscordChannel` — discord.js bot
  - `TelegramChannel` — Telegram Bot API
  - `WebhookChannel` — generic inbound webhooks
- Channel router: dispatch to correct agent/session based on source

**Files**: `src/channels/slack.ts`, `discord.ts`, `telegram.ts`, `webhook.ts`

### 3.2 Channel Allowlists
- Per-channel user/group allowlists
- Cross-channel identity mapping
- Rate limiting per channel

---

## Phase 4: Plugin System (2 weeks)

### 4.1 Plugin Architecture
**Gap**: No extensibility mechanism.
- Define plugin lifecycle: `onLoad`, `onMessage`, `onResponse`, `onCron`, `onShutdown`
- Plugin manifest format (name, version, hooks, config schema)
- Runtime plugin loading from `plugins/` directory
- Plugin isolation: each plugin gets scoped config and logger

### 4.2 Built-in Plugins
- **GitHub Plugin** — auto-create PRs from agent output
- **Metrics Plugin** — Prometheus-compatible metrics endpoint
- **Webhook Plugin** — POST to external URLs on events
- **Notification Plugin** — email/SMS alerts on agent failure

---

## Phase 5: Rich Control UI (2–3 weeks)

### 5.1 React Dashboard
**Gap**: Static HTML dashboard, no interaction beyond restart.
- Replace `ui/` with Next.js or Vite React app
- Server-Sent Events (SSE) for real-time streaming
- Conversation viewer: full message history per session
- Terminal pane: scrollable, searchable, ANSI-rendered
- Agent control panel: start/stop/restart, model switching

### 5.2 Task Queue UI
- Visual task queue with drag-and-drop prioritization
- Session lifecycle visualization (active → idle → closed)
- Cron job editor with cron expression builder
- Activity timeline with filtering and search

### 5.3 Multi-User Support
- JWT-based authentication with refresh tokens
- Role-based access: admin, operator, viewer
- User management UI
- Audit log: who did what, when

---

## Phase 6: Advanced Orchestration (2–3 weeks)

### 6.1 Multi-Agent Routing
**Gap**: Single dedicated agent.
- Agent registry: multiple named agents with different models/workspaces
- Routing rules: direct messages to specific agents based on channel, user, or content
- Agent-scoped sessions: each agent maintains its own session namespace
- Load balancing: round-robin or priority-based

### 6.2 Session Intelligence
**Gap**: Flat session IDs, no context management.
- Canonical session keys with aliases
- Session-to-agent affinity (sticky routing)
- Context window management: auto-summarize long conversations
- Cross-session context sharing

### 6.3 Wake/Sleep Protocol
**Gap**: Simple alive/dead polling.
- Heartbeat runner with configurable intervals
- Wake-on-event: spin up agent only when needed
- Sleep after idle timeout to save resources
- Health dashboard with latency tracking

---

## Phase 7: Production Operations (1–2 weeks)

### 7.1 Config System Depth
**Gap**: YAML config is functional but basic.
- JSON5 config support alongside YAML
- Config migration system (versioned schemas)
- Live config reload without restart
- Profile support: `--profile staging`

### 7.2 CI/CD
- GitHub Actions workflow: lint, typecheck, test
- Docker container build
- Helm chart for Kubernetes deployment
- Health check-based rolling deploys

### 7.3 Monitoring
- Prometheus metrics endpoint (`/metrics`)
- Grafana dashboard template
- Alert rules: agent down, high error rate, cron failures
- OpenTelemetry tracing (request → agent → response)

---

## Priority Order

```
Phase 1 (Foundation)     ████████████░░░░░░░░  Immediate
Phase 2 (Multi-Model)    ████████░░░░░░░░░░░░  High
Phase 3 (Multi-Channel)  ██████░░░░░░░░░░░░░░  High
Phase 5 (Rich UI)        ██████░░░░░░░░░░░░░░  Medium-High
Phase 4 (Plugins)        ████░░░░░░░░░░░░░░░░  Medium
Phase 6 (Orchestration)  ████░░░░░░░░░░░░░░░░  Medium
Phase 7 (Ops)            ██░░░░░░░░░░░░░░░░░░  Lower
```

Estimated total: **10–15 weeks** to full parity.
