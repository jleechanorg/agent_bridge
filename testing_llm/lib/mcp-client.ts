/**
 * MCP JSON-RPC client — adapted from testing_mcp/lib/mcp_client.py
 * Speaks JSON-RPC 2.0 to the gateway's /mcp endpoint.
 */

import { BASE_URL, getAuthHeaders } from "../test_config.js";

export interface MCPResponse {
    jsonrpc: string;
    id: number;
    result?: any;
    error?: { code: number; message: string; data?: any };
}

export class MCPClient {
    private baseUrl: string;
    private headers: Record<string, string>;
    private rpcId = 0;
    private captures: Array<{ method: string; params: any; response: MCPResponse; timestamp: string }> = [];

    constructor(baseUrl = BASE_URL) {
        this.baseUrl = baseUrl;
        this.headers = { ...getAuthHeaders() };
    }

    get mcpUrl(): string {
        return `${this.baseUrl}/mcp`;
    }

    async rpc(method: string, params: Record<string, any> = {}): Promise<MCPResponse> {
        this.rpcId++;
        const payload = { jsonrpc: "2.0", id: this.rpcId, method, params };
        const res = await fetch(this.mcpUrl, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(payload),
        });
        const response = await res.json() as MCPResponse;
        this.captures.push({ method, params, response, timestamp: new Date().toISOString() });
        return response;
    }

    async toolsList(): Promise<any[]> {
        const res = await this.rpc("tools/list");
        if (res.error) throw new Error(`tools/list error: ${res.error.message}`);
        return res.result?.tools ?? [];
    }

    async toolsCall(name: string, args: Record<string, any> = {}): Promise<any> {
        const res = await this.rpc("tools/call", { name, arguments: args });
        if (res.error) throw new Error(`tools/call error: ${res.error.message}`);
        const content = res.result?.content;
        if (Array.isArray(content) && content[0]?.text) {
            return JSON.parse(content[0].text);
        }
        return res.result;
    }

    async waitHealthy(timeoutMs = 10000): Promise<void> {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            try {
                const health = await this.toolsCall("gateway_health");
                if (health?.status === "ok") return;
            } catch { /* not ready */ }
            await new Promise((r) => setTimeout(r, 250));
        }
        throw new Error(`MCP server not healthy after ${timeoutMs}ms`);
    }

    getCapturedRequests() { return this.captures; }
}
