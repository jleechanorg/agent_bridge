// Agent Gateway — Dashboard Client
// WebSocket + REST API integration for real-time monitoring

(function () {
    'use strict';

    // ─── Config ──────────────────────────────────────
    const API_BASE = '';
    const WS_URL = `ws://${location.host}`;
    const POLL_INTERVAL = 5000;
    const TERMINAL_POLL_INTERVAL = 3000;
    const MAX_ACTIVITY_ITEMS = 100;

    // ─── State ───────────────────────────────────────
    let ws = null;
    let wsConnected = false;
    let activities = [];
    let pollTimer = null;
    let terminalTimer = null;

    // ─── DOM refs ────────────────────────────────────
    const $ = (id) => document.getElementById(id);

    // ─── Init ────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        connectWebSocket();
        fetchStatus();
        fetchSessions();
        fetchTerminal();

        pollTimer = setInterval(() => {
            fetchStatus();
            fetchSessions();
        }, POLL_INTERVAL);

        terminalTimer = setInterval(fetchTerminal, TERMINAL_POLL_INTERVAL);
    });

    // ─── WebSocket ───────────────────────────────────
    function connectWebSocket() {
        try {
            ws = new WebSocket(WS_URL);
        } catch {
            setWsStatus(false);
            setTimeout(connectWebSocket, 3000);
            return;
        }

        ws.onopen = () => {
            setWsStatus(true);
            addActivity('system', 'WebSocket connected');
        };

        ws.onclose = () => {
            setWsStatus(false);
            addActivity('system', 'WebSocket disconnected');
            setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = () => {
            setWsStatus(false);
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                handleWsEvent(msg.event, msg.data);
            } catch { /* ignore malformed */ }
        };
    }

    function setWsStatus(connected) {
        wsConnected = connected;
        const badge = $('ws-badge');
        const label = $('ws-label');
        badge.className = `connection-badge ${connected ? 'connected' : 'disconnected'}`;
        label.textContent = connected ? 'Live' : 'Reconnecting…';
    }

    function handleWsEvent(event, data) {
        switch (event) {
            case 'connected':
                addActivity('ws', 'Real-time connection established');
                break;
            case 'chat:message':
                addActivity('chat', `Message received in session ${truncate(data?.sessionId || '?', 20)}`);
                fetchSessions();
                break;
            case 'chat:response':
                addActivity('chat', `Response sent to session ${truncate(data?.sessionId || '?', 20)}`);
                fetchSessions();
                fetchTerminal();
                break;
            case 'cron':
                if (data?.action === 'started') {
                    addActivity('cron', `Cron job "${data.jobId}" started`);
                } else if (data?.action === 'finished') {
                    const status = data.status === 'ok' ? '✅' : '❌';
                    addActivity('cron', `Cron job "${data.jobId}" finished ${status}`);
                }
                break;
            default:
                addActivity('system', `Event: ${event}`);
        }
    }

    // ─── API calls ───────────────────────────────────
    async function fetchStatus() {
        try {
            const res = await fetch(`${API_BASE}/api/status`);
            if (!res.ok) return;
            const data = await res.json();
            renderStatus(data);
        } catch { /* gateway not reachable */ }
    }

    async function fetchSessions() {
        try {
            const res = await fetch(`${API_BASE}/api/sessions`);
            if (!res.ok) return;
            const data = await res.json();
            renderSessions(data.sessions || []);
        } catch { /* ignore */ }
    }

    async function fetchTerminal() {
        try {
            const res = await fetch(`${API_BASE}/api/agent/terminal`);
            if (!res.ok) return;
            const data = await res.json();
            renderTerminal(data.output || '');
        } catch { /* ignore */ }
    }

    async function fetchCronJobs() {
        try {
            const res = await fetch(`${API_BASE}/api/cron/jobs`);
            if (!res.ok) return;
            const data = await res.json();
            renderCronJobs(data.jobs || []);
        } catch { /* ignore */ }
    }

    // ─── Render: Status ──────────────────────────────
    function renderStatus(data) {
        const agent = data.agent || {};
        const sessions = data.sessions || {};
        const cron = data.cron || {};

        // Stats bar
        $('stat-agent').textContent = agent.alive ? 'Online' : 'Offline';
        $('stat-agent-meta').textContent = agent.cli ? `CLI: ${agent.cli}` : '';
        $('stat-messages').textContent = agent.messageCount || 0;
        $('stat-sessions').textContent = sessions.active || 0;
        $('stat-sessions-meta').textContent = `${sessions.total || 0} total`;

        // Uptime
        const uptime = data.gateway?.uptime || 0;
        $('stat-uptime').textContent = formatUptime(uptime);

        // Agent card
        const badge = $('agent-badge');
        const avatar = $('agent-avatar');
        if (agent.alive) {
            badge.className = 'status-badge alive';
            badge.textContent = '● Online';
            avatar.className = 'agent-avatar alive';
        } else {
            badge.className = 'status-badge dead';
            badge.textContent = '● Offline';
            avatar.className = 'agent-avatar dead';
        }

        $('agent-cli').textContent = agent.cli
            ? `${agent.cli.charAt(0).toUpperCase() + agent.cli.slice(1)} Agent`
            : 'Agent';

        $('agent-session').textContent = agent.sessionName || '—';
        $('agent-started').textContent = agent.startedAt
            ? timeAgo(agent.startedAt)
            : '—';
        $('agent-msg-count').textContent = agent.messageCount || 0;

        // Cron jobs
        if (cron.jobs) {
            renderCronJobs(cron.jobs);
        }
    }

    // ─── Render: Sessions ────────────────────────────
    function renderSessions(sessions) {
        const list = $('session-list');
        $('sessions-header-count').textContent = sessions.length;

        if (sessions.length === 0) {
            list.innerHTML = '<li class="empty-state"><span class="icon">💬</span>No active sessions</li>';
            return;
        }

        list.innerHTML = sessions.map(s => `
      <li class="session-item">
        <div>
          <div class="session-id">${escapeHtml(truncate(s.id, 32))}</div>
          <div class="session-detail">${s.senderId ? `Sender: ${escapeHtml(s.senderId)}` : 'Anonymous'} · ${timeAgo(s.updatedAt)}</div>
        </div>
        <div class="session-msgs">${s.messageCount || 0} msgs</div>
      </li>
    `).join('');
    }

    // ─── Render: Terminal ────────────────────────────
    function renderTerminal(output) {
        const el = $('terminal-output');
        if (!output || output.trim().length === 0) {
            el.innerHTML = '<div class="terminal-empty">Agent not started. Terminal output will appear here.</div>';
            return;
        }

        const wasScrolled = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
        el.textContent = output;

        if (wasScrolled) {
            el.scrollTop = el.scrollHeight;
        }
    }

    // ─── Render: Cron Jobs ───────────────────────────
    function renderCronJobs(jobs) {
        const list = $('cron-list');

        if (!jobs || jobs.length === 0) {
            list.innerHTML = '<li class="empty-state"><span class="icon">⏰</span>No scheduled jobs</li>';
            return;
        }

        list.innerHTML = jobs.map(j => `
      <li class="cron-item">
        <div>
          <div class="cron-id">${escapeHtml(j.id)}</div>
          <div class="cron-schedule">${escapeHtml(j.schedule)} ${j.running ? '⏳ Running…' : ''}</div>
        </div>
        <div class="cron-actions">
          <span class="cron-next">${j.nextRunAt ? timeAgo(j.nextRunAt) : '—'}</span>
          <button class="btn" onclick="triggerCron('${escapeHtml(j.id)}')" style="font-size:0.72rem;padding:3px 8px;" ${j.running ? 'disabled' : ''}>▶</button>
        </div>
      </li>
    `).join('');
    }

    // ─── Render: Activity ────────────────────────────
    function addActivity(type, text) {
        activities.unshift({ type, text, time: Date.now() });
        if (activities.length > MAX_ACTIVITY_ITEMS) {
            activities = activities.slice(0, MAX_ACTIVITY_ITEMS);
        }
        renderActivity();
    }

    function renderActivity() {
        const feed = $('activity-feed');
        $('activity-count').textContent = `${activities.length} events`;

        if (activities.length === 0) {
            feed.innerHTML = '<li class="empty-state"><span class="icon">📡</span>No activity yet.</li>';
            return;
        }

        feed.innerHTML = activities.map(a => `
      <li class="activity-item">
        <div class="activity-dot ${a.type}"></div>
        <div class="activity-content">
          <div class="activity-text">${escapeHtml(a.text)}</div>
          <div class="activity-time">${timeAgo(a.time)}</div>
        </div>
      </li>
    `).join('');
    }

    // ─── Actions ─────────────────────────────────────
    window.restartAgent = async function () {
        const btn = $('btn-restart');
        btn.disabled = true;
        btn.textContent = '↻ Restarting…';
        addActivity('system', 'Agent restart requested');

        try {
            const res = await fetch(`${API_BASE}/api/agent/restart`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                addActivity('system', 'Agent restarted successfully');
            } else {
                addActivity('error', `Restart failed: ${data.error || 'unknown'}`);
            }
        } catch (err) {
            addActivity('error', `Restart failed: ${err.message}`);
        } finally {
            btn.disabled = false;
            btn.textContent = '↻ Restart';
            fetchStatus();
            fetchTerminal();
        }
    };

    window.checkHealth = async function () {
        addActivity('system', 'Health check requested');
        try {
            const res = await fetch(`${API_BASE}/health`);
            const data = await res.json();
            addActivity('system', `Health: ${data.status} (uptime: ${formatUptime(data.uptime)})`);
        } catch (err) {
            addActivity('error', `Health check failed: ${err.message}`);
        }
        fetchStatus();
    };

    window.refreshTerminal = function () {
        addActivity('system', 'Terminal refresh requested');
        fetchTerminal();
    };

    window.triggerCron = async function (jobId) {
        addActivity('cron', `Manually triggering job: ${jobId}`);
        try {
            await fetch(`${API_BASE}/api/cron/jobs/${encodeURIComponent(jobId)}/run`, { method: 'POST' });
        } catch (err) {
            addActivity('error', `Cron trigger failed: ${err.message}`);
        }
        fetchStatus();
    };

    // ─── Helpers ─────────────────────────────────────
    function formatUptime(seconds) {
        if (seconds < 60) return `${Math.floor(seconds)}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
        return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
    }

    function timeAgo(timestamp) {
        const diff = Date.now() - timestamp;
        if (diff < 1000) return 'just now';
        if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    }

    function truncate(str, max) {
        return str.length > max ? str.slice(0, max - 1) + '…' : str;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
})();
