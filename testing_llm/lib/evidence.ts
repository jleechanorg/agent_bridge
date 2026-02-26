/**
 * Evidence capture — adapted from testing_mcp/lib/evidence_utils.py
 * Saves test results, captures, and metadata for review.
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface TestResult {
    name: string;
    passed: boolean;
    errors: string[];
    evidence: Record<string, any>;
    durationMs?: number;
}

export class EvidenceCapture {
    private results: TestResult[] = [];
    private baseDir: string;
    private startTime = Date.now();

    constructor(testName: string, baseDir = "/tmp/agent-bridge-evidence") {
        this.baseDir = join(baseDir, testName, new Date().toISOString().slice(0, 10));
        if (!existsSync(this.baseDir)) mkdirSync(this.baseDir, { recursive: true });
    }

    addResult(result: TestResult): void {
        this.results.push(result);
    }

    save(): string {
        const summary = {
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - this.startTime,
            total: this.results.length,
            passed: this.results.filter((r) => r.passed).length,
            failed: this.results.filter((r) => !r.passed).length,
            results: this.results,
        };
        const path = join(this.baseDir, "evidence.json");
        writeFileSync(path, JSON.stringify(summary, null, 2));
        return path;
    }

    printSummary(): void {
        const passed = this.results.filter((r) => r.passed).length;
        const failed = this.results.filter((r) => !r.passed).length;
        console.log(`\n${"═".repeat(50)}`);
        console.log(`  Results: ${passed} passed, ${failed} failed, ${this.results.length} total`);
        if (failed === 0) console.log("  🎉 ALL TESTS PASSED");
        else console.log(`  ⚠️  ${failed} TESTS FAILED`);
        console.log("═".repeat(50));
        for (const r of this.results) {
            console.log(`  ${r.passed ? "✅" : "❌"} ${r.name}`);
            if (!r.passed && r.errors.length) {
                for (const e of r.errors) console.log(`     → ${e}`);
            }
        }
    }
}
