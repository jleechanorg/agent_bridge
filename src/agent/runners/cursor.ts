import { BaseRunner, type BaseRunnerOpts } from "./types.js";

export class CursorRunner extends BaseRunner {
    readonly name = "cursor";

    constructor(opts: BaseRunnerOpts) {
        super(opts);
    }

    buildCommand(): string {
        const parts = ["cursor", "--agent"];
        if (this.model) parts.push("--model", this.model);
        return parts.join(" ");
    }

    getCompletionMarkers(): string[] {
        return ["$", ">", "cursor>"];
    }

    getTimeout(): number {
        return 150_000;
    }
}
