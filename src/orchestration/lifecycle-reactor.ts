/**
 * Lifecycle reactor — state machine for agent PR lifecycle.
 * From ORCHESTRATION_DESIGN.md: working → pr_open → ci_failed → retry → stuck
 */

export type AgentLifecycleState =
    | "working" | "pr_open" | "ci_failed"
    | "review_pending" | "changes_requested" | "approved"
    | "mergeable" | "merged"
    | "stuck" | "needs_input" | "errored" | "killed" | "done";

const TERMINAL_STATES: Set<AgentLifecycleState> = new Set([
    "merged", "stuck", "needs_input", "errored", "killed", "done",
]);

export class LifecycleReactor {
    state: AgentLifecycleState = "working";
    retryCount = 0;
    history: AgentLifecycleState[] = ["working"];
    private maxRetries: number;
    private listeners: Array<(from: AgentLifecycleState, to: AgentLifecycleState) => void> = [];

    constructor(
        public readonly agentId: string,
        opts: { maxRetries?: number } = {},
    ) {
        this.maxRetries = opts.maxRetries ?? 3;
    }

    transition(to: AgentLifecycleState): void {
        const from = this.state;
        this.state = to;
        this.history.push(to);
        for (const fn of this.listeners) fn(from, to);
    }

    retry(): void {
        this.retryCount++;
        if (this.retryCount > this.maxRetries) {
            this.transition("stuck");
        } else {
            this.transition("working");
        }
    }

    onTransition(fn: (from: AgentLifecycleState, to: AgentLifecycleState) => void): void {
        this.listeners.push(fn);
    }

    get isTerminal(): boolean {
        return TERMINAL_STATES.has(this.state);
    }
}
