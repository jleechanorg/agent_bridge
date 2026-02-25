import { describe, it, expect } from "vitest";
import {
    AgentBridgeError,
    AgentError,
    ConfigError,
    AuthError,
    SessionError,
    ChannelError,
    formatErrorResponse,
} from "../../src/errors.js";

describe("Error Hierarchy", () => {
    // ─── Base error ──────────────────────────────

    it("AgentBridgeError is an Error", () => {
        const err = new AgentBridgeError("test", "TEST_ERR");
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(AgentBridgeError);
        expect(err.message).toBe("test");
        expect(err.code).toBe("TEST_ERR");
        expect(err.name).toBe("AgentBridgeError");
    });

    it("AgentBridgeError has optional context", () => {
        const err = new AgentBridgeError("test", "TEST_ERR", { userId: "U1" });
        expect(err.context).toEqual({ userId: "U1" });
    });

    // ─── Subclass errors ────────────────────────

    it("AgentError inherits from AgentBridgeError", () => {
        const err = new AgentError("agent crashed");
        expect(err).toBeInstanceOf(AgentBridgeError);
        expect(err).toBeInstanceOf(AgentError);
        expect(err.code).toBe("AGENT_ERROR");
        expect(err.name).toBe("AgentError");
    });

    it("ConfigError with custom code", () => {
        const err = new ConfigError("invalid yaml", "CONFIG_PARSE_ERROR");
        expect(err).toBeInstanceOf(AgentBridgeError);
        expect(err.code).toBe("CONFIG_PARSE_ERROR");
    });

    it("AuthError defaults to AUTH_ERROR code", () => {
        const err = new AuthError("unauthorized");
        expect(err.code).toBe("AUTH_ERROR");
        expect(err.statusCode).toBe(401);
    });

    it("AuthError with forbidden status", () => {
        const err = new AuthError("forbidden", "AUTH_FORBIDDEN", 403);
        expect(err.statusCode).toBe(403);
        expect(err.code).toBe("AUTH_FORBIDDEN");
    });

    it("SessionError defaults to SESSION_ERROR", () => {
        const err = new SessionError("not found");
        expect(err.code).toBe("SESSION_ERROR");
    });

    it("ChannelError defaults to CHANNEL_ERROR", () => {
        const err = new ChannelError("disconnected");
        expect(err.code).toBe("CHANNEL_ERROR");
    });

    // ─── Structured error response ──────────────

    it("formatErrorResponse returns structured JSON shape", () => {
        const err = new AgentError("agent crashed", { sessionName: "test-1" });
        const response = formatErrorResponse(err);

        expect(response.error).toBe("agent crashed");
        expect(response.code).toBe("AGENT_ERROR");
        expect(response.context).toEqual({ sessionName: "test-1" });
    });

    it("formatErrorResponse handles plain errors", () => {
        const err = new Error("something broke");
        const response = formatErrorResponse(err);

        expect(response.error).toBe("something broke");
        expect(response.code).toBe("INTERNAL_ERROR");
        expect(response.context).toBeUndefined();
    });

    it("formatErrorResponse handles unknown values", () => {
        const response = formatErrorResponse("string error");
        expect(response.error).toBe("string error");
        expect(response.code).toBe("INTERNAL_ERROR");
    });

    // ─── Cause chain ────────────────────────────

    it("supports error cause chain", () => {
        const root = new Error("root cause");
        const wrapper = new AgentError("agent failed", {}, root);

        expect(wrapper.cause).toBe(root);
        expect((wrapper.cause as Error).message).toBe("root cause");
    });
});
