import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig, clearConfigCache } from "../../src/config/loader.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("Config Loader", () => {
    let tmpDir: string;

    beforeEach(() => {
        clearConfigCache();
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ag-test-config-"));
    });

    afterEach(() => {
        clearConfigCache();
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("should return defaults when no config file exists", () => {
        const config = loadConfig(tmpDir);
        expect(config.gateway.port).toBe(18789);
        expect(config.gateway.host).toBe("0.0.0.0");
        expect(config.agent.cli).toBe("claude");
        expect(config.agent.workspace).toBe(".");
        expect(config.cron.enabled).toBe(false);
        expect(config.session.scope).toBe("per-sender");
        expect(Object.keys(config.mcpServers)).toHaveLength(0);
    });

    it("should load a YAML config file", () => {
        const yamlContent = `
gateway:
  port: 9999
  host: 127.0.0.1
agent:
  cli: codex
  workspace: /tmp/test
`;
        fs.writeFileSync(path.join(tmpDir, "config.yaml"), yamlContent);

        const config = loadConfig(tmpDir);
        expect(config.gateway.port).toBe(9999);
        expect(config.gateway.host).toBe("127.0.0.1");
        expect(config.agent.cli).toBe("codex");
        expect(config.agent.workspace).toBe("/tmp/test");
    });

    it("should load a JSON config file", () => {
        const jsonContent = JSON.stringify({
            gateway: { port: 8888 },
            agent: { cli: "claude" },
        });
        fs.writeFileSync(path.join(tmpDir, "config.json"), jsonContent);

        const config = loadConfig(tmpDir);
        expect(config.gateway.port).toBe(8888);
    });

    it("should apply env var overrides", () => {
        process.env.GATEWAY_PORT = "7777";
        process.env.AGENT_CLI = "codex";

        try {
            const config = loadConfig(tmpDir);
            expect(config.gateway.port).toBe(7777);
            expect(config.agent.cli).toBe("codex");
        } finally {
            delete process.env.GATEWAY_PORT;
            delete process.env.AGENT_CLI;
        }
    });

    it("should parse MCP servers from config", () => {
        const yamlContent = `
mcpServers:
  my-server:
    command: node
    args: ["/path/to/server.js"]
    env:
      API_KEY: "test-key"
`;
        fs.writeFileSync(path.join(tmpDir, "config.yaml"), yamlContent);

        const config = loadConfig(tmpDir);
        expect(config.mcpServers["my-server"]).toBeDefined();
        expect(config.mcpServers["my-server"].command).toBe("node");
        expect(config.mcpServers["my-server"].args).toEqual(["/path/to/server.js"]);
        expect(config.mcpServers["my-server"].env?.API_KEY).toBe("test-key");
    });

    it("should throw on invalid config values", () => {
        const yamlContent = `
agent:
  cli: invalid_cli_name
`;
        fs.writeFileSync(path.join(tmpDir, "config.yaml"), yamlContent);

        expect(() => loadConfig(tmpDir)).toThrow();
    });

    it("should cache config after first load", () => {
        const config1 = loadConfig(tmpDir);
        const config2 = loadConfig(tmpDir);
        expect(config1).toBe(config2); // Same reference
    });

    it("should reload config after clearConfigCache", () => {
        const config1 = loadConfig(tmpDir);
        clearConfigCache();
        const config2 = loadConfig(tmpDir);
        expect(config1).not.toBe(config2); // Different reference
        expect(config1).toEqual(config2); // Same values
    });
});
