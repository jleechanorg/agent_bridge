/**
 * Genesis memory system — workspace, daily logs, curation.
 * From GENESIS_DESIGN.md: MEMORY.md curation, search config, cron jobs.
 */

export interface DailyLogSection {
    heading: string;
    items: string[];
}

export interface DailyLog {
    date: string;
    sections: DailyLogSection[];
}

export class MemoryWorkspace {
    static standardFiles(): string[] {
        return ["SOUL.md", "USER.md", "TOOLS.md", "MEMORY.md", "HEARTBEAT.md"];
    }

    static dailyLogFilename(date: Date): string {
        const iso = date.toISOString().slice(0, 10);
        return `memory/${iso}.md`;
    }

    static buildSearchConfig(opts: {
        extraPaths?: string[];
        temporalDecayDays?: number;
        mmrLambda?: number;
    }) {
        return {
            memorySearch: {
                enabled: true,
                extraPaths: opts.extraPaths ?? [],
                query: {
                    hybrid: {
                        enabled: true,
                        vectorWeight: 0.7,
                        textWeight: 0.3,
                        temporalDecay: {
                            enabled: true,
                            halfLifeDays: opts.temporalDecayDays ?? 30,
                        },
                        mmr: {
                            enabled: true,
                            lambda: opts.mmrLambda ?? 0.7,
                        },
                    },
                },
                experimental: { sessionMemory: true },
            },
        };
    }
}

export class MemoryCurator {
    static buildCurationPrompt(days: number): string {
        return `Review daily memory files (memory/*.md) from the last ${days} days. Extract important decisions, patterns, project status updates, and lessons learned. Update MEMORY.md with curated durable knowledge. Don't duplicate existing entries. Keep MEMORY.md concise and focused on facts that help future sessions start warm.`;
    }

    static buildCronJob(opts: { schedule: string; timezone: string }) {
        return {
            id: "genesis-memory-curation",
            name: "Genesis MEMORY.md curation",
            enabled: true,
            schedule: {
                kind: "cron",
                expr: opts.schedule,
                tz: opts.timezone,
            },
            sessionTarget: "isolated",
            wakeMode: "now",
            payload: {
                kind: "agentTurn",
                message: MemoryCurator.buildCurationPrompt(7),
            },
            delivery: { mode: "none", channel: "last" },
        };
    }

    static parseDailyLog(content: string): { sections: DailyLogSection[] } {
        const sections: DailyLogSection[] = [];
        let currentHeading = "";
        let currentItems: string[] = [];

        for (const line of content.split("\n")) {
            const headingMatch = line.match(/^## (.+)/);
            if (headingMatch) {
                if (currentHeading) {
                    sections.push({ heading: currentHeading, items: [...currentItems] });
                }
                currentHeading = headingMatch[1];
                currentItems = [];
            } else if (line.startsWith("- ") && currentHeading) {
                currentItems.push(line.slice(2));
            }
        }
        if (currentHeading) {
            sections.push({ heading: currentHeading, items: currentItems });
        }
        return { sections };
    }

    static deduplicateFacts(logs: DailyLog[]): string[] {
        const seen = new Set<string>();
        const facts: string[] = [];
        for (const log of logs) {
            for (const section of log.sections) {
                for (const item of section.items) {
                    if (!seen.has(item)) {
                        seen.add(item);
                        facts.push(item);
                    }
                }
            }
        }
        return facts;
    }
}
