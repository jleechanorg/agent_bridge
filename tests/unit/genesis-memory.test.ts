import { describe, it, expect } from "vitest";
import { MemoryWorkspace, MemoryCurator, type DailyLog } from "../../src/genesis/memory.js";

describe("Genesis — Memory System", () => {
    describe("MemoryWorkspace", () => {
        it("lists workspace files", () => {
            const files = MemoryWorkspace.standardFiles();
            expect(files).toContain("SOUL.md");
            expect(files).toContain("USER.md");
            expect(files).toContain("TOOLS.md");
            expect(files).toContain("MEMORY.md");
            expect(files).toContain("HEARTBEAT.md");
        });

        it("generates daily log filename", () => {
            const name = MemoryWorkspace.dailyLogFilename(new Date("2026-02-25"));
            expect(name).toBe("memory/2026-02-25.md");
        });

        it("generates memory search config", () => {
            const config = MemoryWorkspace.buildSearchConfig({
                extraPaths: ["/path/to/CLAUDE.md"],
                temporalDecayDays: 30,
                mmrLambda: 0.7,
            });
            expect(config.memorySearch.enabled).toBe(true);
            expect(config.memorySearch.extraPaths).toContain("/path/to/CLAUDE.md");
            expect(config.memorySearch.query.hybrid.temporalDecay.halfLifeDays).toBe(30);
        });
    });

    describe("MemoryCurator", () => {
        it("generates curation prompt", () => {
            const prompt = MemoryCurator.buildCurationPrompt(7);
            expect(prompt).toContain("memory/*.md");
            expect(prompt).toContain("7 days");
            expect(prompt).toContain("MEMORY.md");
        });

        it("generates cron job config", () => {
            const job = MemoryCurator.buildCronJob({
                schedule: "0 22 * * 0",
                timezone: "America/Los_Angeles",
            });
            expect(job.id).toBe("genesis-memory-curation");
            expect(job.schedule.expr).toBe("0 22 * * 0");
            expect(job.payload.kind).toBe("agentTurn");
        });

        it("parses daily log entries", () => {
            const content = "# 2026-02-25\n\n## Decisions\n- Used SQLite\n\n## Learnings\n- Pino is fast";
            const log = MemoryCurator.parseDailyLog(content);
            expect(log.sections).toHaveLength(2);
            expect(log.sections[0].heading).toBe("Decisions");
            expect(log.sections[1].heading).toBe("Learnings");
        });

        it("extracts key facts from daily logs", () => {
            const logs: DailyLog[] = [
                { date: "2026-02-25", sections: [{ heading: "Decisions", items: ["Used SQLite", "Chose Pino"] }] },
                { date: "2026-02-24", sections: [{ heading: "Decisions", items: ["Used SQLite"] }] },
            ];
            const facts = MemoryCurator.deduplicateFacts(logs);
            expect(facts).toContain("Used SQLite");
            expect(facts).toContain("Chose Pino");
            expect(facts.filter((f) => f === "Used SQLite")).toHaveLength(1); // deduped
        });
    });
});
