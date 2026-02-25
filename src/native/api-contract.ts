/**
 * Native app API contract — defines all gateway endpoints for mobile/desktop clients.
 */

export interface Endpoint {
    id: string;
    method: string;
    path: string;
    auth: boolean;
    description: string;
}

const ENDPOINTS: Endpoint[] = [
    { id: "health", method: "GET", path: "/health", auth: false, description: "Health check" },
    { id: "status", method: "GET", path: "/api/status", auth: true, description: "Gateway and agent status" },
    { id: "chat", method: "POST", path: "/api/chat", auth: true, description: "Send message to agent" },
    { id: "sessions-list", method: "GET", path: "/api/sessions", auth: true, description: "List sessions" },
    { id: "sessions-create", method: "POST", path: "/api/sessions", auth: true, description: "Create session" },
    { id: "sessions-get", method: "GET", path: "/api/sessions/:id", auth: true, description: "Get session" },
    { id: "sessions-close", method: "DELETE", path: "/api/sessions/:id", auth: true, description: "Close session" },
    { id: "cron-list", method: "GET", path: "/api/cron", auth: true, description: "List cron jobs" },
    { id: "cron-trigger", method: "POST", path: "/api/cron/:name/trigger", auth: true, description: "Trigger cron job" },
    { id: "agent-terminal", method: "GET", path: "/api/agent/terminal", auth: true, description: "Stream terminal" },
    { id: "agent-restart", method: "POST", path: "/api/agent/restart", auth: true, description: "Restart agent" },
    { id: "websocket", method: "WS", path: "/ws", auth: false, description: "WebSocket events" },
    { id: "dashboard", method: "GET", path: "/", auth: false, description: "Dashboard UI" },
];

export class ApiContract {
    static endpoints(): Endpoint[] {
        return [...ENDPOINTS];
    }

    static find(id: string): Endpoint | undefined {
        return ENDPOINTS.find((e) => e.id === id);
    }

    static authEndpoints(): Endpoint[] {
        return ENDPOINTS.filter((e) => e.auth);
    }

    static publicEndpoints(): Endpoint[] {
        return ENDPOINTS.filter((e) => !e.auth);
    }
}

export class NativeAppConfig {
    readonly gatewayUrl: string;
    readonly authToken: string;
    readonly wsUrl: string;

    constructor(opts: { gatewayUrl: string; authToken: string }) {
        this.gatewayUrl = opts.gatewayUrl;
        this.authToken = opts.authToken;
        this.wsUrl = opts.gatewayUrl
            .replace(/^http:/, "ws:")
            .replace(/^https:/, "wss:") + "/ws";
    }

    authHeaders(): Record<string, string> {
        return { Authorization: `Bearer ${this.authToken}` };
    }

    endpoint(id: string): string {
        const ep = ApiContract.find(id);
        if (!ep) throw new Error(`Unknown endpoint: ${id}`);
        return `${this.gatewayUrl}${ep.path}`;
    }
}
