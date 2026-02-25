/**
 * Config reloader — watches config files for changes and triggers reload.
 */

import fs from "node:fs";
import crypto from "node:crypto";

export class ConfigReloader {
    private configPath: string;
    private lastHash: string;
    private callbacks: Array<() => void> = [];

    constructor(configPath: string) {
        this.configPath = configPath;
        this.lastHash = this._computeHash();
    }

    private _computeHash(): string {
        try {
            const content = fs.readFileSync(this.configPath, "utf-8");
            return crypto.createHash("sha256").update(content).digest("hex");
        } catch {
            return "";
        }
    }

    hasChanged(): boolean {
        const currentHash = this._computeHash();
        return currentHash !== this.lastHash;
    }

    onReload(callback: () => void): void {
        this.callbacks.push(callback);
    }

    check(): void {
        if (this.hasChanged()) {
            this.lastHash = this._computeHash();
            for (const cb of this.callbacks) {
                cb();
            }
        }
    }
}
