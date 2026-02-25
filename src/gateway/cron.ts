import { Cron } from "croner";
import type { CronConfig, CronJobConfig } from "../config/types.js";
import type { AgentLifecycle } from "../agent/lifecycle.js";
import { createLogger } from "../logger.js";

const log = createLogger("gateway/cron");

export interface CronJobState {
    id: string;
    schedule: string;
    message: string;
    enabled: boolean;
    lastRunAt: number | null;
    nextRunAt: number | null;
    running: boolean;
    error: string | null;
}

export class CronService {
    private jobs = new Map<string, { config: CronJobConfig; cron: Cron; state: CronJobState }>();
    private agent: AgentLifecycle;
    private onEvent?: (event: CronEvent) => void;

    constructor(opts: {
        config: CronConfig;
        agent: AgentLifecycle;
        onEvent?: (event: CronEvent) => void;
    }) {
        this.agent = opts.agent;
        this.onEvent = opts.onEvent;

        if (!opts.config.enabled) {
            log.info("cron is disabled");
            return;
        }

        for (const job of opts.config.jobs) {
            this.addJob(job);
        }

        log.info(`cron service started with ${this.jobs.size} job(s)`);
    }

    addJob(config: CronJobConfig): void {
        if (this.jobs.has(config.id)) {
            log.warn(`duplicate cron job id: ${config.id}, skipping`);
            return;
        }

        const state: CronJobState = {
            id: config.id,
            schedule: config.schedule,
            message: config.message,
            enabled: config.enabled,
            lastRunAt: null,
            nextRunAt: null,
            running: false,
            error: null,
        };

        const cron = new Cron(config.schedule, {
            catch: (err) => {
                state.error = String(err);
                log.error(`cron job ${config.id} error`, { error: String(err) });
            },
        }, async () => {
            if (!config.enabled || state.running) return;
            await this.runJob(config.id);
        });

        state.nextRunAt = cron.nextRun()?.getTime() ?? null;
        this.jobs.set(config.id, { config, cron, state });

        log.info(`registered cron job: ${config.id}`, {
            schedule: config.schedule,
            nextRun: state.nextRunAt ? new Date(state.nextRunAt).toISOString() : null,
        });
    }

    async runJob(id: string): Promise<void> {
        const job = this.jobs.get(id);
        if (!job) {
            log.warn(`cron job not found: ${id}`);
            return;
        }

        const { config, state, cron } = job;
        state.running = true;
        state.error = null;

        log.info(`running cron job: ${id}`, { message: config.message });
        this.emitEvent({ action: "started", jobId: id });

        try {
            const response = await this.agent.sendMessage(config.message);
            state.lastRunAt = Date.now();
            state.nextRunAt = cron.nextRun()?.getTime() ?? null;

            this.emitEvent({
                action: "finished",
                jobId: id,
                status: "ok",
                summary: response.slice(0, 500),
            });

            log.info(`cron job ${id} completed`, { responseLength: response.length });
        } catch (err) {
            state.error = String(err);
            state.lastRunAt = Date.now();

            this.emitEvent({
                action: "finished",
                jobId: id,
                status: "error",
                error: String(err),
            });

            log.error(`cron job ${id} failed`, { error: String(err) });
        } finally {
            state.running = false;
        }
    }

    listJobs(): CronJobState[] {
        return Array.from(this.jobs.values()).map((j) => ({ ...j.state }));
    }

    getJob(id: string): CronJobState | undefined {
        return this.jobs.get(id)?.state;
    }

    stop(): void {
        for (const { cron } of this.jobs.values()) {
            cron.stop();
        }
        this.jobs.clear();
        log.info("cron service stopped");
    }

    private emitEvent(event: CronEvent): void {
        this.onEvent?.(event);
    }
}

export interface CronEvent {
    action: "started" | "finished";
    jobId: string;
    status?: "ok" | "error";
    summary?: string;
    error?: string;
}
