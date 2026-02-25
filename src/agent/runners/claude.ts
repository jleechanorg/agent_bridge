import { BaseRunner, type BaseRunnerOpts } from "./types.js";

export class ClaudeRunner extends BaseRunner {
    readonly name = "claude";

    constructor(opts: BaseRunnerOpts) {
        super(opts);
    }

    buildCommand(): string {
        const parts = ["claude", "--dangerously-skip-permissions"];
        if (this.model) parts.push("--model", this.model);
        return parts.join(" ");
    }

    getCompletionMarkers(): string[] {
        return ["$", ">", "❯", "claude>"];
    }

    getTimeout(): number {
        return 120_000;
    }
}
