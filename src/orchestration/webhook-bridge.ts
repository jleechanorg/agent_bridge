/**
 * Webhook bridge — fire-and-forget event emission to Mission Control.
 * From ORCHESTRATION_DESIGN.md Phase 1.
 */

export interface OrchEvent {
    event: string;
    payload: Record<string, any>;
    timestamp: string;
}

export class WebhookBridge {
    private url?: string;
    private onEvent?: (event: OrchEvent) => void;

    constructor(opts: { url?: string; onEvent?: (event: OrchEvent) => void } = {}) {
        this.url = opts.url;
        this.onEvent = opts.onEvent;
    }

    emit(event: string, payload: Record<string, any>): void {
        const orchEvent: OrchEvent = {
            event,
            payload,
            timestamp: new Date().toISOString(),
        };
        try {
            this.onEvent?.(orchEvent);
        } catch {
            // Fire-and-forget — never block orchestration for dashboard
        }
    }

    buildPayload(event: string, payload: Record<string, any>): { url: string; body: string; headers: Record<string, string> } {
        return {
            url: this.url ?? "",
            body: JSON.stringify({ event, ...payload, timestamp: new Date().toISOString() }),
            headers: { "Content-Type": "application/json" },
        };
    }
}
