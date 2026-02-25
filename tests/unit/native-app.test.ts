import { describe, it, expect } from "vitest";
import { NativeAppConfig, ApiContract, type Endpoint } from "../../src/native/api-contract.js";

describe("Native App API Contract", () => {
    describe("NativeAppConfig", () => {
        it("creates config with gateway URL", () => {
            const config = new NativeAppConfig({
                gatewayUrl: "http://localhost:19876",
                authToken: "test-token",
            });
            expect(config.gatewayUrl).toBe("http://localhost:19876");
            expect(config.authToken).toBe("test-token");
        });

        it("generates WebSocket URL", () => {
            const config = new NativeAppConfig({
                gatewayUrl: "http://localhost:19876",
                authToken: "t",
            });
            expect(config.wsUrl).toBe("ws://localhost:19876/ws");
        });

        it("handles https → wss", () => {
            const config = new NativeAppConfig({
                gatewayUrl: "https://bridge.example.com",
                authToken: "t",
            });
            expect(config.wsUrl).toBe("wss://bridge.example.com/ws");
        });

        it("builds auth headers", () => {
            const config = new NativeAppConfig({
                gatewayUrl: "http://localhost:19876",
                authToken: "my-token",
            });
            expect(config.authHeaders()).toEqual({
                Authorization: "Bearer my-token",
            });
        });
    });

    describe("ApiContract", () => {
        it("lists all endpoints", () => {
            const endpoints = ApiContract.endpoints();
            expect(endpoints.length).toBeGreaterThan(5);
        });

        it("has health endpoint", () => {
            const ep = ApiContract.find("health");
            expect(ep?.method).toBe("GET");
            expect(ep?.path).toBe("/health");
            expect(ep?.auth).toBe(false);
        });

        it("has chat endpoint", () => {
            const ep = ApiContract.find("chat");
            expect(ep?.method).toBe("POST");
            expect(ep?.path).toBe("/api/chat");
            expect(ep?.auth).toBe(true);
        });

        it("has sessions endpoints", () => {
            const list = ApiContract.find("sessions-list");
            const create = ApiContract.find("sessions-create");
            expect(list?.path).toBe("/api/sessions");
            expect(create?.method).toBe("POST");
        });

        it("has WebSocket endpoint", () => {
            const ws = ApiContract.find("websocket");
            expect(ws?.path).toBe("/ws");
            expect(ws?.auth).toBe(false);
        });
    });
});
