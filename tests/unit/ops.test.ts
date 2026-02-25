import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PrometheusMetrics } from "../../src/monitoring/prometheus.js";
import { ConfigReloader } from "../../src/config/reloader.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("Production Operations", () => {
    // ─── Prometheus Metrics ──────────────────────

    describe("PrometheusMetrics", () => {
        it("should create a metrics instance", () => {
            const metrics = new PrometheusMetrics();
            expect(metrics).toBeDefined();
        });

        it("should track counters", () => {
            const metrics = new PrometheusMetrics();
            metrics.increment("messages_total");
            metrics.increment("messages_total");
            expect(metrics.get("messages_total")).toBe(2);
        });

        it("should track gauges", () => {
            const metrics = new PrometheusMetrics();
            metrics.setGauge("active_sessions", 5);
            expect(metrics.get("active_sessions")).toBe(5);
        });

        it("should render Prometheus text format", () => {
            const metrics = new PrometheusMetrics();
            metrics.increment("requests_total");
            metrics.setGauge("uptime_seconds", 42);

            const text = metrics.render();
            expect(text).toContain("requests_total 1");
            expect(text).toContain("uptime_seconds 42");
        });
    });

    // ─── Config Reloader ──────────────────────────

    describe("ConfigReloader", () => {
        let tmpDir: string;

        beforeEach(() => {
            tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ab-reload-test-"));
        });

        afterEach(() => {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        });

        it("should detect config file changes", () => {
            const configPath = path.join(tmpDir, "config.yaml");
            fs.writeFileSync(configPath, "port: 8080");

            const reloader = new ConfigReloader(configPath);
            expect(reloader.hasChanged()).toBe(false);

            fs.writeFileSync(configPath, "port: 9090");
            expect(reloader.hasChanged()).toBe(true);
        });

        it("should call onChange callback", () => {
            const configPath = path.join(tmpDir, "config.yaml");
            fs.writeFileSync(configPath, "port: 8080");

            const onChange = vi.fn();
            const reloader = new ConfigReloader(configPath);
            reloader.onReload(onChange);

            fs.writeFileSync(configPath, "port: 9090");
            reloader.check();

            expect(onChange).toHaveBeenCalledTimes(1);
        });

        it("should not call onChange when unchanged", () => {
            const configPath = path.join(tmpDir, "config.yaml");
            fs.writeFileSync(configPath, "port: 8080");

            const onChange = vi.fn();
            const reloader = new ConfigReloader(configPath);
            reloader.onReload(onChange);
            reloader.check();

            expect(onChange).toHaveBeenCalledTimes(0);
        });
    });
});
