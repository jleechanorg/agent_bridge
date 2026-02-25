import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DaemonManager } from "../../src/daemon/manager.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("Daemon Manager", () => {
    let tmpDir: string;
    let pidPath: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ab-daemon-test-"));
        pidPath = path.join(tmpDir, "daemon.pid");
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("writes PID file", () => {
        const mgr = new DaemonManager(pidPath);
        mgr.writePid(12345);
        expect(fs.existsSync(pidPath)).toBe(true);
        expect(fs.readFileSync(pidPath, "utf-8").trim()).toBe("12345");
    });

    it("reads PID file", () => {
        const mgr = new DaemonManager(pidPath);
        mgr.writePid(99999);
        expect(mgr.readPid()).toBe(99999);
    });

    it("returns null when no PID file", () => {
        const mgr = new DaemonManager(pidPath);
        expect(mgr.readPid()).toBeNull();
    });

    it("removes PID file", () => {
        const mgr = new DaemonManager(pidPath);
        mgr.writePid(111);
        mgr.removePid();
        expect(fs.existsSync(pidPath)).toBe(false);
    });

    it("checks if current process is running", () => {
        const mgr = new DaemonManager(pidPath);
        mgr.writePid(process.pid);
        expect(mgr.isRunning()).toBe(true);
    });

    it("detects stale PID", () => {
        const mgr = new DaemonManager(pidPath);
        mgr.writePid(999999999); // unlikely to be running
        expect(mgr.isRunning()).toBe(false);
    });
});
