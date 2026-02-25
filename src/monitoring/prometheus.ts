/**
 * Prometheus-compatible metrics — counters, gauges, text format rendering.
 */

export class PrometheusMetrics {
    private counters: Map<string, number> = new Map();
    private gauges: Map<string, number> = new Map();

    increment(name: string, amount: number = 1): void {
        const current = this.counters.get(name) ?? 0;
        this.counters.set(name, current + amount);
    }

    setGauge(name: string, value: number): void {
        this.gauges.set(name, value);
    }

    get(name: string): number | undefined {
        return this.counters.get(name) ?? this.gauges.get(name);
    }

    render(): string {
        const lines: string[] = [];

        for (const [name, value] of this.counters) {
            lines.push(`# TYPE ${name} counter`);
            lines.push(`${name} ${value}`);
        }

        for (const [name, value] of this.gauges) {
            lines.push(`# TYPE ${name} gauge`);
            lines.push(`${name} ${value}`);
        }

        return lines.join("\n") + "\n";
    }

    reset(): void {
        this.counters.clear();
        this.gauges.clear();
    }
}
