import { BaseRunner, type BaseRunnerOpts } from "./types.js";

export class CodexRunner extends BaseRunner {
    readonly name = "codex";

    constructor(opts: BaseRunnerOpts) {
        super(opts);
    }

    buildCommand(): string {
        const parts = ["codex", "--full-auto"];
        if (this.model) parts.push("--model", this.model);
        return parts.join(" ");
    }

    getCompletionMarkers(): string[] {
        return ["$", ">", "codex>"];
    }

    getTimeout(): number {
        return 180_000; // Codex can be slower
    }
}
