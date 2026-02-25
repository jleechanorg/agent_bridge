/**
 * Wake/sleep controller — manages agent lifecycle based on activity.
 */

export class WakeSleepController {
    private awake: boolean = false;
    private _lastActivity: number = 0;
    private idleTimeoutMs: number;

    constructor(opts: { idleTimeoutMs: number }) {
        this.idleTimeoutMs = opts.idleTimeoutMs;
    }

    wake(): void {
        this.awake = true;
        this._lastActivity = Date.now();
    }

    sleep(): void {
        this.awake = false;
    }

    isAwake(): boolean {
        return this.awake;
    }

    recordActivity(): void {
        this._lastActivity = Date.now();
    }

    lastActivity(): number {
        return this._lastActivity;
    }

    isIdle(): boolean {
        if (!this.awake) return false;
        return Date.now() - this._lastActivity > this.idleTimeoutMs;
    }

    checkAndSleep(): void {
        if (this.isIdle()) {
            this.sleep();
        }
    }

    /** Test helper */
    _setLastActivity(ts: number): void {
        this._lastActivity = ts;
    }
}
