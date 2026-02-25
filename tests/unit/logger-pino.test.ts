import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createStructuredLogger, type StructuredLogger } from "../../src/logger-pino.js";
import { Writable } from "node:stream";

function collectLogs(): { logs: any[]; stream: Writable } {
    const logs: any[] = [];
    const stream = new Writable({
        write(chunk, _encoding, callback) {
            try {
                logs.push(JSON.parse(chunk.toString()));
            } catch { /* ignore parse errors */ }
            callback();
        },
    });
    return { logs, stream };
}

describe("Structured Logger (pino)", () => {
    it("should create a logger with subsystem", () => {
        const { logs, stream } = collectLogs();
        const logger = createStructuredLogger("test-sub", { stream });
        logger.info("hello");

        expect(logs).toHaveLength(1);
        expect(logs[0].msg).toBe("hello");
        expect(logs[0].subsystem).toBe("test-sub");
    });

    it("should log at different levels", () => {
        const { logs, stream } = collectLogs();
        const logger = createStructuredLogger("levels", { stream, level: "debug" });

        logger.debug("debug msg");
        logger.info("info msg");
        logger.warn("warn msg");
        logger.error("error msg");

        expect(logs).toHaveLength(4);
        expect(logs[0].level).toBe(20); // debug
        expect(logs[1].level).toBe(30); // info
        expect(logs[2].level).toBe(40); // warn
        expect(logs[3].level).toBe(50); // error
    });

    it("should include structured data", () => {
        const { logs, stream } = collectLogs();
        const logger = createStructuredLogger("data", { stream });
        logger.info("with data", { userId: "U123", count: 42 });

        expect(logs[0].userId).toBe("U123");
        expect(logs[0].count).toBe(42);
    });

    it("should create child loggers", () => {
        const { logs, stream } = collectLogs();
        const parent = createStructuredLogger("parent", { stream });
        const child = parent.child("child-op");
        child.info("from child");

        expect(logs[0].subsystem).toBe("parent");
        expect(logs[0].operation).toBe("child-op");
    });

    it("should respect log level filtering", () => {
        const { logs, stream } = collectLogs();
        const logger = createStructuredLogger("filter", { stream, level: "warn" });

        logger.debug("should not appear");
        logger.info("should not appear");
        logger.warn("should appear");
        logger.error("should appear");

        expect(logs).toHaveLength(2);
    });

    it("should include timestamp", () => {
        const { logs, stream } = collectLogs();
        const logger = createStructuredLogger("ts", { stream });
        logger.info("timestamped");

        expect(logs[0].time).toBeDefined();
        expect(typeof logs[0].time).toBe("number");
    });
});
