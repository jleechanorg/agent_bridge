import { BaseRunner, type BaseRunnerOpts } from "./types.js";

export class GeminiRunner extends BaseRunner {
    readonly name = "gemini";

    constructor(opts: BaseRunnerOpts) {
        super(opts);
    }

    buildCommand(): string {
        const parts = ["gemini"];
        if (this.model) parts.push("--model", this.model);
        return parts.join(" ");
    }

    getCompletionMarkers(): string[] {
        return ["$", ">", "gemini>", "❯"];
    }

    getTimeout(): number {
        return 120_000;
    }

    getPollInterval(): number {
        return 2000; // Gemini may need slightly longer poll
    }
}
