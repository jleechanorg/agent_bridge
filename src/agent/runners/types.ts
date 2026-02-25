/**
 * Runner interface and factory — abstracts CLI agent interaction.
 */

export interface Runner {
    /** Human-readable runner name */
    readonly name: string;

    /** Start the agent session */
    start(): void;

    /** Stop the agent session */
    stop(): void;

    /** Check if the agent session is alive */
    isAlive(): boolean;

    /** Send a message/command to the agent */
    send(message: string): void;

    /** Capture current terminal output */
    capture(): string;
}

export interface RunnerConfig {
    cli: string;
    workspace: string;
    sessionName: string;
    model?: string;
}

export interface BaseRunnerOpts {
    workspace: string;
    sessionName: string;
    model?: string;
}

/** Base class for all runners with shared tmux logic */
export abstract class BaseRunner implements Runner {
    abstract readonly name: string;
    protected workspace: string;
    protected sessionName: string;
    protected model?: string;

    constructor(opts: BaseRunnerOpts) {
        this.workspace = opts.workspace;
        this.sessionName = opts.sessionName;
        this.model = opts.model;
    }

    /** Build the CLI command string */
    abstract buildCommand(): string;

    /** Get markers that indicate the agent has finished responding */
    getCompletionMarkers(): string[] {
        return ["$", ">", "❯"];
    }

    /** Strip ANSI escape codes from output */
    stripAnsi(str: string): string {
        // eslint-disable-next-line no-control-regex
        return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
    }

    /** Get timeout in ms for waiting for agent responses */
    getTimeout(): number {
        return 120_000;
    }

    /** Get poll interval in ms */
    getPollInterval(): number {
        return 1500;
    }

    start(): void {
        const { execSync } = require("node:child_process");
        const cmd = this.buildCommand();
        execSync(
            `tmux -L agent-bridge new-session -d -s ${this.sessionName} -c ${this.workspace} ${cmd}`,
            { stdio: "pipe" },
        );
    }

    stop(): void {
        const { execSync } = require("node:child_process");
        try {
            execSync(`tmux -L agent-bridge kill-session -t ${this.sessionName}`, {
                stdio: "pipe",
            });
        } catch { /* session may not exist */ }
    }

    isAlive(): boolean {
        const { execSync } = require("node:child_process");
        try {
            execSync(`tmux -L agent-bridge has-session -t ${this.sessionName}`, {
                stdio: "pipe",
            });
            return true;
        } catch {
            return false;
        }
    }

    send(message: string): void {
        const { execSync } = require("node:child_process");
        const escaped = message.replace(/'/g, "'\\''");
        execSync(
            `tmux -L agent-bridge send-keys -t ${this.sessionName} '${escaped}' Enter`,
            { stdio: "pipe" },
        );
    }

    capture(): string {
        const { execSync } = require("node:child_process");
        try {
            const output = execSync(
                `tmux -L agent-bridge capture-pane -t ${this.sessionName} -p -S -500`,
                { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
            );
            return this.stripAnsi(output);
        } catch {
            return "";
        }
    }
}

export type RunnerCreator = (config: RunnerConfig) => Runner;

export class RunnerFactory {
    private registry: Map<string, RunnerCreator> = new Map();

    register(name: string, creator: RunnerCreator): void {
        this.registry.set(name, creator);
    }

    create(config: RunnerConfig): Runner {
        const creator = this.registry.get(config.cli);
        if (!creator) {
            throw new Error(`Unsupported CLI runner: ${config.cli}`);
        }
        return creator(config);
    }

    listRegistered(): string[] {
        return [...this.registry.keys()];
    }
}

