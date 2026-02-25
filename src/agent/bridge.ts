import { spawn, execSync, type SpawnOptions } from "node:child_process";
import path from "node:path";
import { createLogger } from "../logger.js";
import { sleep } from "../utils.js";

const log = createLogger("agent/bridge");

export interface TmuxSessionInfo {
    name: string;
    created: number;
    alive: boolean;
}

const TMUX_SOCKET = "agent-orch";
const CAPTURE_BUFFER_LINES = 500;

function tmuxCmd(args: string[]): string {
    try {
        return execSync(`tmux -L ${TMUX_SOCKET} ${args.join(" ")}`, {
            encoding: "utf-8",
            timeout: 10_000,
        }).trim();
    } catch {
        return "";
    }
}

function tmuxCmdWithStatus(args: string[]): { output: string; ok: boolean } {
    try {
        const output = execSync(`tmux -L ${TMUX_SOCKET} ${args.join(" ")}`, {
            encoding: "utf-8",
            timeout: 10_000,
        }).trim();
        return { output, ok: true };
    } catch {
        return { output: "", ok: false };
    }
}

/**
 * Check if a tmux session exists.
 */
export function isSessionAlive(sessionName: string): boolean {
    const { ok } = tmuxCmdWithStatus(["has-session", "-t", sessionName]);
    return ok;
}

/**
 * List all tmux sessions on our socket.
 */
export function listSessions(): TmuxSessionInfo[] {
    const output = tmuxCmd([
        "list-sessions",
        "-F",
        "#{session_name}:#{session_created}",
    ]);
    if (!output) return [];

    return output.split("\n").filter(Boolean).map((line) => {
        const [name, createdStr] = line.split(":");
        return {
            name: name ?? "",
            created: parseInt(createdStr ?? "0", 10) * 1000,
            alive: true,
        };
    });
}

/**
 * Kill a tmux session if it exists.
 */
export function killSession(sessionName: string): void {
    if (isSessionAlive(sessionName)) {
        tmuxCmd(["kill-session", "-t", sessionName]);
        log.info(`killed tmux session: ${sessionName}`);
    }
}

/**
 * Create a new tmux session running the specified CLI agent.
 */
export function createAgentSession(opts: {
    sessionName: string;
    cli: "claude" | "codex";
    workspace: string;
    model?: string;
    env?: Record<string, string>;
}): void {
    // Kill existing session with same name
    killSession(opts.sessionName);

    const workdir = path.resolve(opts.workspace);

    // Build the command to run inside tmux
    let agentCmd: string;
    if (opts.cli === "claude") {
        const parts = ["claude", "--dangerously-skip-permissions"];
        if (opts.model) {
            parts.push("--model", opts.model);
        }
        agentCmd = parts.join(" ");
    } else {
        const parts = ["codex", "--full-auto"];
        if (opts.model) {
            parts.push("--model", opts.model);
        }
        agentCmd = parts.join(" ");
    }

    // Build tmux new-session command
    const tmuxArgs = [
        "-L", TMUX_SOCKET,
        "new-session",
        "-d",
        "-s", opts.sessionName,
        "-c", workdir,
        agentCmd,
    ];

    const spawnEnv = { ...process.env, ...opts.env };

    try {
        execSync(`tmux ${tmuxArgs.join(" ")}`, {
            env: spawnEnv,
            encoding: "utf-8",
            timeout: 15_000,
        });
        log.info(`created tmux session: ${opts.sessionName}`, {
            cli: opts.cli,
            workspace: workdir,
            model: opts.model,
        });
    } catch (err) {
        log.error(`failed to create tmux session: ${opts.sessionName}`, {
            error: String(err),
        });
        throw new Error(`Failed to create agent session: ${err}`);
    }
}

/**
 * Send text input to a tmux session via send-keys.
 */
export function sendToSession(sessionName: string, text: string): void {
    if (!isSessionAlive(sessionName)) {
        throw new Error(`Session ${sessionName} is not alive`);
    }

    // Escape special characters for tmux send-keys
    const escaped = text.replace(/'/g, "'\\''");
    tmuxCmd(["send-keys", "-t", sessionName, `'${escaped}'`, "Enter"]);

    log.debug(`sent message to session: ${sessionName}`, {
        length: text.length,
    });
}

/**
 * Capture the current pane content from a tmux session.
 */
export function captureSessionOutput(sessionName: string): string {
    if (!isSessionAlive(sessionName)) {
        return "";
    }

    const output = tmuxCmd([
        "capture-pane",
        "-t", sessionName,
        "-p",
        "-S", `-${CAPTURE_BUFFER_LINES}`,
    ]);

    return output;
}

/**
 * Wait for the agent to produce new output after sending a message.
 * Polls the pane content and returns when it stabilizes.
 */
export async function waitForAgentResponse(
    sessionName: string,
    opts: {
        timeoutMs?: number;
        pollIntervalMs?: number;
        stableCountThreshold?: number;
    } = {},
): Promise<string> {
    const timeout = opts.timeoutMs ?? 120_000;
    const pollInterval = opts.pollIntervalMs ?? 1000;
    const stableThreshold = opts.stableCountThreshold ?? 3;

    const startTime = Date.now();
    let lastOutput = "";
    let stableCount = 0;

    // Give the agent a moment to start processing
    await sleep(2000);

    while (Date.now() - startTime < timeout) {
        const currentOutput = captureSessionOutput(sessionName);

        if (currentOutput === lastOutput && currentOutput.length > 0) {
            stableCount++;
            if (stableCount >= stableThreshold) {
                return currentOutput;
            }
        } else {
            stableCount = 0;
        }

        lastOutput = currentOutput;
        await sleep(pollInterval);
    }

    log.warn(`agent response timed out after ${timeout}ms`, { sessionName });
    return lastOutput;
}
