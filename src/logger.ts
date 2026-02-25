import chalk from "chalk";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_COLORS: Record<LogLevel, (s: string) => string> = {
    debug: chalk.gray,
    info: chalk.cyan,
    warn: chalk.yellow,
    error: chalk.red,
};

function formatTimestamp(): string {
    return new Date().toISOString().replace("T", " ").replace("Z", "");
}

export function createLogger(subsystem: string) {
    const prefix = chalk.dim(`[${subsystem}]`);

    function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
        const ts = chalk.dim(formatTimestamp());
        const lvl = LEVEL_COLORS[level](level.toUpperCase().padEnd(5));
        const dataStr = data ? ` ${chalk.dim(JSON.stringify(data))}` : "";
        const line = `${ts} ${lvl} ${prefix} ${message}${dataStr}`;

        if (level === "error") {
            console.error(line);
        } else if (level === "warn") {
            console.warn(line);
        } else {
            console.log(line);
        }
    }

    return {
        debug: (msg: string, data?: Record<string, unknown>) => log("debug", msg, data),
        info: (msg: string, data?: Record<string, unknown>) => log("info", msg, data),
        warn: (msg: string, data?: Record<string, unknown>) => log("warn", msg, data),
        error: (msg: string, data?: Record<string, unknown>) => log("error", msg, data),
        child: (name: string) => createLogger(`${subsystem}/${name}`),
    };
}

export type Logger = ReturnType<typeof createLogger>;
