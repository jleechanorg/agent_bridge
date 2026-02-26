/**
 * Gateway HTTP client — adapted from testing_http requests pattern.
 * Similar to testing_mcp/lib/mcp_client.py but for the gateway REST API.
 */

import { BASE_URL, getAuthHeaders } from "../test_config.js";

export interface GatewayResponse {
    status: number;
    body: any;
    headers: Record<string, string>;
    latencyMs: number;
}

export class GatewayClient {
    private baseUrl: string;
    private headers: Record<string, string>;
    private captures: Array<{ method: string; path: string; status: number; latencyMs: number; timestamp: string }> = [];

    constructor(baseUrl = BASE_URL, authToken?: string) {
        this.baseUrl = baseUrl;
        this.headers = authToken
            ? { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" }
            : getAuthHeaders();
    }

    async get(path: string): Promise<GatewayResponse> {
        return this.request("GET", path);
    }

    async post(path: string, body?: any): Promise<GatewayResponse> {
        return this.request("POST", path, body);
    }

    async del(path: string): Promise<GatewayResponse> {
        return this.request("DELETE", path);
    }

    private async request(method: string, path: string, body?: any): Promise<GatewayResponse> {
        const url = `${this.baseUrl}${path}`;
        const start = Date.now();
        const res = await fetch(url, {
            method,
            headers: this.headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        const latencyMs = Date.now() - start;
        let responseBody: any;
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("json")) {
            responseBody = await res.json();
        } else {
            responseBody = await res.text();
        }
        this.captures.push({ method, path, status: res.status, latencyMs, timestamp: new Date().toISOString() });
        return {
            status: res.status,
            body: responseBody,
            headers: Object.fromEntries(res.headers.entries()),
            latencyMs,
        };
    }

    getCapturedRequests() { return this.captures; }
}
