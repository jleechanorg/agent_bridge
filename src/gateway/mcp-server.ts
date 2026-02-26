/**
 * MCP Server — JSON-RPC 2.0 endpoint.
 * Adapted from testing_mcp/lib/mcp_client.py patterns.
 *
 * Exposes agent bridge functionality as MCP tools:
 * - gateway_health: health check
 * - gateway_status: full status
 * - sessions_list: list sessions
 * - sessions_create: create session
 * - send_chat: send a chat message
 * - agent_status: agent lifecycle state
 * - cron_list: list cron jobs
 */

import type { Request, Response } from "express";

export interface JSONRPCRequest {
    jsonrpc: string;
    id: number | string;
    method: string;
    params: Record<string, any>;
}

export interface JSONRPCResponse {
    jsonrpc: "2.0";
    id: number | string;
    result?: any;
    error?: { code: number; message: string; data?: any };
}

interface ToolDef {
    name: string;
    description: string;
    inputSchema: Record<string, any>;
}

interface MCPServerOpts {
    getHealth?: () => any;
    getStatus?: () => any;
    listSessions?: () => any[];
    createSession?: (opts: any) => any;
    sendChat?: (message: string, sessionId?: string) => Promise<any>;
    getAgentStatus?: () => any;
    listCronJobs?: () => any[];
}

const TOOLS: ToolDef[] = [
    {
        name: "gateway_health",
        description: "Check gateway server health",
        inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
        name: "gateway_status",
        description: "Get full gateway status including agent, sessions, cron",
        inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
        name: "sessions_list",
        description: "List all chat sessions",
        inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
        name: "sessions_create",
        description: "Create a new chat session",
        inputSchema: {
            type: "object",
            properties: { senderId: { type: "string" }, channel: { type: "string" } },
        },
    },
    {
        name: "send_chat",
        description: "Send a chat message to the agent",
        inputSchema: {
            type: "object",
            properties: {
                message: { type: "string", description: "Message to send" },
                sessionId: { type: "string", description: "Optional session ID" },
            },
            required: ["message"],
        },
    },
    {
        name: "agent_status",
        description: "Get agent lifecycle status",
        inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
        name: "cron_list",
        description: "List all cron jobs",
        inputSchema: { type: "object", properties: {}, required: [] },
    },
];

export class MCPServer {
    private opts: MCPServerOpts;

    constructor(opts: MCPServerOpts = {}) {
        this.opts = opts;
    }

    async handle(req: JSONRPCRequest): Promise<JSONRPCResponse> {
        const id = req.id;

        // Validate JSON-RPC version
        if (req.jsonrpc !== "2.0") {
            return { jsonrpc: "2.0", id, error: { code: -32600, message: "Invalid Request: jsonrpc must be '2.0'" } };
        }

        switch (req.method) {
            case "tools/list":
                return { jsonrpc: "2.0", id, result: { tools: TOOLS } };

            case "tools/call":
                return this.handleToolCall(id, req.params);

            default:
                return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${req.method}` } };
        }
    }

    private async handleToolCall(id: number | string, params: Record<string, any>): Promise<JSONRPCResponse> {
        const { name, arguments: args = {} } = params;
        const tool = TOOLS.find((t) => t.name === name);
        if (!tool) {
            return { jsonrpc: "2.0", id, error: { code: -32602, message: `Unknown tool: ${name}` } };
        }

        try {
            let result: any;
            switch (name) {
                case "gateway_health":
                    result = this.opts.getHealth?.() ?? { status: "ok" };
                    break;
                case "gateway_status":
                    result = this.opts.getStatus?.() ?? {};
                    break;
                case "sessions_list":
                    result = this.opts.listSessions?.() ?? [];
                    break;
                case "sessions_create":
                    result = this.opts.createSession?.(args) ?? { id: "stub" };
                    break;
                case "send_chat": {
                    if (!args.message) {
                        return { jsonrpc: "2.0", id, error: { code: -32602, message: "Missing required argument: message" } };
                    }
                    result = await (this.opts.sendChat?.(args.message, args.sessionId) ?? Promise.resolve({ response: "stub" }));
                    break;
                }
                case "agent_status":
                    result = this.opts.getAgentStatus?.() ?? {};
                    break;
                case "cron_list":
                    result = this.opts.listCronJobs?.() ?? [];
                    break;
                default:
                    return { jsonrpc: "2.0", id, error: { code: -32602, message: `Unhandled tool: ${name}` } };
            }
            return {
                jsonrpc: "2.0", id,
                result: { content: [{ type: "text", text: JSON.stringify(result) }] },
            };
        } catch (err: any) {
            return { jsonrpc: "2.0", id, error: { code: -32603, message: err.message ?? "Internal error" } };
        }
    }

    expressHandler(): (req: Request, res: Response) => void {
        return async (req: Request, res: Response) => {
            const body = req.body as JSONRPCRequest;
            const response = await this.handle(body);
            res.json(response);
        };
    }
}
