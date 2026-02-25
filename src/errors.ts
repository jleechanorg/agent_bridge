/**
 * Typed error hierarchy for Agent Bridge.
 * All errors extend AgentBridgeError with error codes and optional context.
 */

export class AgentBridgeError extends Error {
    readonly code: string;
    readonly context?: Record<string, unknown>;

    constructor(
        message: string,
        code: string,
        contextOrCause?: Record<string, unknown> | Error,
        cause?: Error,
    ) {
        // Handle overloaded signature: (msg, code, context, cause) or (msg, code, cause)
        if (contextOrCause instanceof Error) {
            super(message, { cause: contextOrCause });
            this.code = code;
            this.context = undefined;
        } else {
            super(message, cause ? { cause } : undefined);
            this.code = code;
            this.context = contextOrCause;
        }
        this.name = this.constructor.name;
    }
}

export class AgentError extends AgentBridgeError {
    constructor(message: string, context?: Record<string, unknown>, cause?: Error) {
        super(message, "AGENT_ERROR", context, cause);
    }
}

export class ConfigError extends AgentBridgeError {
    constructor(message: string, code: string = "CONFIG_ERROR", context?: Record<string, unknown>) {
        super(message, code, context);
    }
}

export class AuthError extends AgentBridgeError {
    readonly statusCode: number;

    constructor(message: string, code: string = "AUTH_ERROR", statusCode: number = 401, context?: Record<string, unknown>) {
        super(message, code, context);
        this.statusCode = statusCode;
    }
}

export class SessionError extends AgentBridgeError {
    constructor(message: string, code: string = "SESSION_ERROR", context?: Record<string, unknown>) {
        super(message, code, context);
    }
}

export class ChannelError extends AgentBridgeError {
    constructor(message: string, code: string = "CHANNEL_ERROR", context?: Record<string, unknown>) {
        super(message, code, context);
    }
}

/**
 * Format any error value into a structured JSON response.
 */
export function formatErrorResponse(err: unknown): {
    error: string;
    code: string;
    context?: Record<string, unknown>;
} {
    if (err instanceof AgentBridgeError) {
        return {
            error: err.message,
            code: err.code,
            context: err.context,
        };
    }

    if (err instanceof Error) {
        return {
            error: err.message,
            code: "INTERNAL_ERROR",
        };
    }

    return {
        error: String(err),
        code: "INTERNAL_ERROR",
    };
}
