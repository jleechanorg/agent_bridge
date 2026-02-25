import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BootChecker } from "../../src/agent/boot-check.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("Boot Checker", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ab-boot-test-"));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("should detect BOOT.md exists", () => {
        fs.writeFileSync(path.join(tmpDir, "BOOT.md"), "# Boot instructions\nRun tests first.");
        const checker = new BootChecker(tmpDir);
        expect(checker.hasBootFile()).toBe(true);
    });

    it("should detect BOOT.md does not exist", () => {
        const checker = new BootChecker(tmpDir);
        expect(checker.hasBootFile()).toBe(false);
    });

    it("should read BOOT.md contents", () => {
        const content = "# Boot\nVerify agent can reach API.";
        fs.writeFileSync(path.join(tmpDir, "BOOT.md"), content);
        const checker = new BootChecker(tmpDir);
        expect(checker.readBootFile()).toBe(content);
    });

    it("should return null when reading nonexistent BOOT.md", () => {
        const checker = new BootChecker(tmpDir);
        expect(checker.readBootFile()).toBeNull();
    });

    it("should build boot prompt from BOOT.md", () => {
        fs.writeFileSync(path.join(tmpDir, "BOOT.md"), "Check that the API is reachable.");
        const checker = new BootChecker(tmpDir);
        const prompt = checker.buildBootPrompt();

        expect(prompt).toContain("Check that the API is reachable.");
        expect(prompt).toContain("boot");
    });

    it("should validate boot with mock agent (success)", async () => {
        fs.writeFileSync(path.join(tmpDir, "BOOT.md"), "Say OK if ready.");
        const checker = new BootChecker(tmpDir);

        const result = await checker.runBootCheck(async (prompt) => {
            return "OK, I'm ready. All checks passed.";
        });

        expect(result.passed).toBe(true);
        expect(result.response).toContain("OK");
    });

    it("should validate boot with mock agent (failure)", async () => {
        fs.writeFileSync(path.join(tmpDir, "BOOT.md"), "Verify connection.");
        const checker = new BootChecker(tmpDir);

        const result = await checker.runBootCheck(async (_prompt) => {
            throw new Error("Agent crashed during boot");
        });

        expect(result.passed).toBe(false);
        expect(result.error).toContain("Agent crashed");
    });

    it("should skip boot check when no BOOT.md", async () => {
        const checker = new BootChecker(tmpDir);

        const result = await checker.runBootCheck(async () => "ok");

        expect(result.passed).toBe(true);
        expect(result.skipped).toBe(true);
    });
});
