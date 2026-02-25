/**
 * Docker sandbox — containerized agent execution with resource limits.
 */

export type ContainerState = "stopped" | "running" | "removed";

export interface SandboxConfig {
    image: string;
    cpuLimit: string;
    memoryLimit: string;
    networkEnabled: boolean;
    readonlyFs: boolean;
    volumes: string[];
    timeout: number;
}

export class DockerSandbox {
    state: ContainerState = "stopped";
    private config: SandboxConfig;

    constructor(partial: Partial<SandboxConfig>) {
        this.config = {
            image: partial.image ?? "agent-bridge:latest",
            cpuLimit: partial.cpuLimit ?? "1.0",
            memoryLimit: partial.memoryLimit ?? "512m",
            networkEnabled: partial.networkEnabled ?? false,
            readonlyFs: partial.readonlyFs ?? true,
            volumes: partial.volumes ?? [],
            timeout: partial.timeout ?? 300,
        };
    }

    getConfig(): SandboxConfig {
        return { ...this.config };
    }

    simulateStart(): void {
        if (this.state === "removed") throw new Error("Cannot start a removed container");
        this.state = "running";
    }

    simulateStop(): void {
        this.state = "stopped";
    }

    simulateRemove(): void {
        this.state = "removed";
    }

    buildRunCommand(): string {
        const parts = ["docker run", "-d"];

        parts.push(`--cpus=${this.config.cpuLimit}`);
        parts.push(`--memory=${this.config.memoryLimit}`);

        if (this.config.readonlyFs) parts.push("--read-only");
        if (!this.config.networkEnabled) parts.push("--network=none");

        for (const vol of this.config.volumes) {
            parts.push(`-v ${vol}`);
        }

        parts.push(this.config.image);
        return parts.join(" ");
    }

    buildExecCommand(cmd: string): string {
        return `docker exec ${this.config.image} ${cmd}`;
    }

    buildStopCommand(): string {
        return `docker stop ${this.config.image}`;
    }
}
