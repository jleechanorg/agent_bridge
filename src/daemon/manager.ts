/**
 * Daemon manager — PID file management and process detection.
 */

import fs from "node:fs";
import path from "node:path";

export class DaemonManager {
    private pidPath: string;

    constructor(pidPath: string) {
        this.pidPath = pidPath;
    }

    writePid(pid: number): void {
        const dir = path.dirname(this.pidPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(this.pidPath, String(pid), "utf-8");
    }

    readPid(): number | null {
        try {
            const content = fs.readFileSync(this.pidPath, "utf-8").trim();
            const pid = parseInt(content, 10);
            return isNaN(pid) ? null : pid;
        } catch {
            return null;
        }
    }

    removePid(): void {
        try { fs.unlinkSync(this.pidPath); } catch { }
    }

    isRunning(): boolean {
        const pid = this.readPid();
        if (pid === null) return false;
        try {
            process.kill(pid, 0);
            return true;
        } catch {
            return false;
        }
    }
}
