/**
 * Runner barrel — re-exports all runners and provides the default createRunner.
 */

export type { Runner, RunnerConfig, BaseRunnerOpts, RunnerCreator } from "./types.js";
export { BaseRunner, RunnerFactory } from "./types.js";
export { ClaudeRunner } from "./claude.js";
export { CodexRunner } from "./codex.js";
export { GeminiRunner } from "./gemini.js";
export { CursorRunner } from "./cursor.js";

import { ClaudeRunner } from "./claude.js";
import { CodexRunner } from "./codex.js";
import { GeminiRunner } from "./gemini.js";
import { CursorRunner } from "./cursor.js";
import type { Runner, RunnerConfig } from "./types.js";

/**
 * Create a runner from config. Supports: claude, codex, gemini, cursor.
 */
export function createRunner(config: RunnerConfig): Runner {
    switch (config.cli) {
        case "claude":
            return new ClaudeRunner(config);
        case "codex":
            return new CodexRunner(config);
        case "gemini":
            return new GeminiRunner(config);
        case "cursor":
            return new CursorRunner(config);
        default:
            throw new Error(`Unsupported CLI runner: ${config.cli}`);
    }
}
