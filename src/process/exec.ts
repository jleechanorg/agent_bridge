/**
 * Process management — safe exec with timeout and serial command queue.
 */

import { exec } from "node:child_process";

export interface ExecResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    timedOut: boolean;
}

export async function safeExec(
    command: string,
    opts: { timeoutMs?: number; shell?: boolean } = {},
): Promise<ExecResult> {
    return new Promise((resolve) => {
        const child = exec(command, {
            timeout: opts.timeoutMs,
            shell: opts.shell !== false ? "/bin/sh" : undefined,
        }, (error, stdout, stderr) => {
            resolve({
                stdout: String(stdout ?? ""),
                stderr: String(stderr ?? ""),
                exitCode: error?.code ?? (error ? 1 : 0),
                timedOut: error?.killed ?? false,
            });
        });
    });
}

export class CommandQueue {
    private queue: Array<() => Promise<void>> = [];
    private running = false;

    get length(): number {
        return this.queue.length;
    }

    async enqueue(fn: () => Promise<void>): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const wrapped = async () => {
                try {
                    await fn();
                    resolve();
                } catch (err) {
                    reject(err);
                }
            };
            this.queue.push(wrapped);
            if (!this.running) this._drain();
        });
    }

    private async _drain(): Promise<void> {
        this.running = true;
        while (this.queue.length > 0) {
            const task = this.queue.shift()!;
            try {
                await task();
            } catch { /* error passed via reject */ }
        }
        this.running = false;
    }
}
