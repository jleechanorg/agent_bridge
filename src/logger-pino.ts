/**
 * Structured logger using pino — production-grade JSON logging.
 */

import pino from "pino";
import type { Writable } from "node:stream";

export interface StructuredLogger {
    debug(msg: string, data?: Record<string, unknown>): void;
    info(msg: string, data?: Record<string, unknown>): void;
    warn(msg: string, data?: Record<string, unknown>): void;
    error(msg: string, data?: Record<string, unknown>): void;
    child(operation: string): StructuredLogger;
}

interface LoggerOptions {
    stream?: Writable;
    level?: string;
    pretty?: boolean;
}

export function createStructuredLogger(
    subsystem: string,
    opts: LoggerOptions = {},
): StructuredLogger {
    const pinoOpts: pino.LoggerOptions = {
        level: opts.level ?? "info",
        base: { subsystem },
    };

    // Use pino-pretty for dev mode
    if (opts.pretty && !opts.stream) {
        pinoOpts.transport = {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "HH:MM:ss.l",
                ignore: "pid,hostname",
            },
        };
    }

    const logger = opts.stream
        ? pino(pinoOpts, opts.stream)
        : pino(pinoOpts);

    return wrapPinoLogger(logger, subsystem);
}

function wrapPinoLogger(pinoLogger: pino.Logger, subsystem: string): StructuredLogger {
    return {
        debug(msg: string, data?: Record<string, unknown>) {
            if (data) pinoLogger.debug(data, msg);
            else pinoLogger.debug(msg);
        },
        info(msg: string, data?: Record<string, unknown>) {
            if (data) pinoLogger.info(data, msg);
            else pinoLogger.info(msg);
        },
        warn(msg: string, data?: Record<string, unknown>) {
            if (data) pinoLogger.warn(data, msg);
            else pinoLogger.warn(msg);
        },
        error(msg: string, data?: Record<string, unknown>) {
            if (data) pinoLogger.error(data, msg);
            else pinoLogger.error(msg);
        },
        child(operation: string): StructuredLogger {
            const childLogger = pinoLogger.child({ operation });
            return wrapPinoLogger(childLogger, subsystem);
        },
    };
}
