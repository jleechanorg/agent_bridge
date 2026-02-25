/**
 * TUI — Terminal UI with command parsing and formatting.
 */

export interface ParsedCommand {
    command: string;
    args: string[];
}

const COMMANDS = ["help", "status", "restart", "quit", "send", "sessions", "clear"];

export class TuiCommandParser {
    static parse(input: string): ParsedCommand | null {
        const trimmed = input.trim();
        if (!trimmed.startsWith("/")) return null;

        const parts = trimmed.slice(1).split(/\s+/);
        return {
            command: parts[0],
            args: parts.slice(1),
        };
    }

    static availableCommands(): string[] {
        return [...COMMANDS];
    }
}

export class TuiFormatter {
    static badge(status: string): string {
        const colors: Record<string, string> = {
            active: "\x1b[32m● active\x1b[0m",
            stopped: "\x1b[31m○ stopped\x1b[0m",
            idle: "\x1b[33m◐ idle\x1b[0m",
        };
        return colors[status] ?? `[${status}]`;
    }

    static timestamp(date: Date): string {
        return date.toISOString().slice(11, 19);
    }

    static agentResponse(text: string): string {
        return `\x1b[36m⤷ ${text}\x1b[0m`;
    }

    static error(message: string): string {
        return `\x1b[31m✗ ${message}\x1b[0m`;
    }

    static info(message: string): string {
        return `\x1b[90mℹ ${message}\x1b[0m`;
    }
}
