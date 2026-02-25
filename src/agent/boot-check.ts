/**
 * Boot checker — validates the agent environment on first start.
 * Reads BOOT.md from the workspace and runs a validation prompt.
 */

import fs from "node:fs";
import path from "node:path";

export interface BootCheckResult {
    passed: boolean;
    skipped?: boolean;
    response?: string;
    error?: string;
}

export type AgentSendFn = (prompt: string) => Promise<string>;

export class BootChecker {
    private workspace: string;
    private bootPath: string;

    constructor(workspace: string) {
        this.workspace = workspace;
        this.bootPath = path.join(workspace, "BOOT.md");
    }

    hasBootFile(): boolean {
        return fs.existsSync(this.bootPath);
    }

    readBootFile(): string | null {
        if (!this.hasBootFile()) return null;
        return fs.readFileSync(this.bootPath, "utf-8");
    }

    buildBootPrompt(): string {
        const content = this.readBootFile();
        if (!content) return "";

        return [
            "You are performing a boot validation check.",
            "The following instructions describe what to verify before starting work.",
            "Execute the checks described and report the results.",
            "",
            "--- BOOT.md ---",
            content,
            "--- END ---",
            "",
            "Report OK if all checks pass, or describe any failures.",
        ].join("\n");
    }

    async runBootCheck(sendToAgent: AgentSendFn): Promise<BootCheckResult> {
        if (!this.hasBootFile()) {
            return { passed: true, skipped: true };
        }

        const prompt = this.buildBootPrompt();

        try {
            const response = await sendToAgent(prompt);
            return {
                passed: true,
                response,
            };
        } catch (err) {
            return {
                passed: false,
                error: err instanceof Error ? err.message : String(err),
            };
        }
    }
}
