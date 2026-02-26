import { describe, it, expect } from "vitest";
import {
  MCPServer,
  type JSONRPCRequest,
  type JSONRPCResponse,
} from "../../src/gateway/mcp-server.js";

describe("MCP Server — JSON-RPC 2.0", () => {
  describe("Protocol compliance", () => {
    it("returns tools/list with available tools", async () => {
      const mcp = new MCPServer();
      const res = await mcp.handle({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
      expect(res.jsonrpc).toBe("2.0");
      expect(res.id).toBe(1);
      expect(res.result.tools).toBeDefined();
      expect(Array.isArray(res.result.tools)).toBe(true);
      expect(res.result.tools.length).toBeGreaterThan(0);
    });

    it("each tool has name, description, inputSchema", async () => {
      const mcp = new MCPServer();
      const res = await mcp.handle({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
      for (const tool of res.result.tools) {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
      }
    });

    it("returns error for unknown method", async () => {
      const mcp = new MCPServer();
      const res = await mcp.handle({ jsonrpc: "2.0", id: 1, method: "unknown/thing", params: {} });
      expect(res.error).toBeDefined();
      expect(res.error.code).toBe(-32601); // Method not found
    });

    it("returns error for invalid JSON-RPC version", async () => {
      const mcp = new MCPServer();
      const res = await mcp.handle({ jsonrpc: "1.0", id: 1, method: "tools/list", params: {} } as any);
      expect(res.error).toBeDefined();
      expect(res.error.code).toBe(-32600); // Invalid request
    });

    it("echoes request id in response", async () => {
      const mcp = new MCPServer();
      const res = await mcp.handle({ jsonrpc: "2.0", id: 42, method: "tools/list", params: {} });
      expect(res.id).toBe(42);
    });
  });

  describe("tools/call — gateway_status", () => {
    it("returns server status", async () => {
      const mcp = new MCPServer({ getStatus: () => ({ uptime: 100, agent: { alive: true } }) });
      const res = await mcp.handle({
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "gateway_status", arguments: {} },
      });
      expect(res.result).toBeDefined();
      expect(res.result.content).toBeDefined();
      const text = JSON.parse(res.result.content[0].text);
      expect(text.uptime).toBe(100);
    });
  });

  describe("tools/call — gateway_health", () => {
    it("returns health check", async () => {
      const mcp = new MCPServer({ getHealth: () => ({ status: "ok", uptime: 50 }) });
      const res = await mcp.handle({
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "gateway_health", arguments: {} },
      });
      const text = JSON.parse(res.result.content[0].text);
      expect(text.status).toBe("ok");
    });
  });

  describe("tools/call — sessions_list", () => {
    it("returns session list", async () => {
      const mcp = new MCPServer({ listSessions: () => [{ id: "s1", status: "active" }] });
      const res = await mcp.handle({
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "sessions_list", arguments: {} },
      });
      const text = JSON.parse(res.result.content[0].text);
      expect(text).toHaveLength(1);
      expect(text[0].id).toBe("s1");
    });
  });

  describe("tools/call — send_chat", () => {
    it("sends message and returns response", async () => {
      const mcp = new MCPServer({
        sendChat: async (msg: string) => ({ sessionId: "s1", response: `echo: ${msg}` }),
      });
      const res = await mcp.handle({
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "send_chat", arguments: { message: "hello" } },
      });
      const text = JSON.parse(res.result.content[0].text);
      expect(text.response).toBe("echo: hello");
      expect(text.sessionId).toBe("s1");
    });

    it("returns error for missing message argument", async () => {
      const mcp = new MCPServer();
      const res = await mcp.handle({
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "send_chat", arguments: {} },
      });
      expect(res.error).toBeDefined();
      expect(res.error.code).toBe(-32602); // Invalid params
    });
  });

  describe("tools/call — unknown tool", () => {
    it("returns error for unknown tool name", async () => {
      const mcp = new MCPServer();
      const res = await mcp.handle({
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "nonexistent_tool", arguments: {} },
      });
      expect(res.error).toBeDefined();
      expect(res.error.code).toBe(-32602);
    });
  });

  describe("Express middleware", () => {
    it("builds Express handler", () => {
      const mcp = new MCPServer();
      const handler = mcp.expressHandler();
      expect(typeof handler).toBe("function");
    });
  });
});
