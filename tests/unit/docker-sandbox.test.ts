import { describe, it, expect } from "vitest";
import { DockerSandbox, type SandboxConfig, type ContainerState } from "../../src/docker/sandbox.js";

describe("Docker Sandbox", () => {
    describe("SandboxConfig", () => {
        it("has sensible defaults", () => {
            const sandbox = new DockerSandbox({});
            const config = sandbox.getConfig();
            expect(config.cpuLimit).toBe("1.0");
            expect(config.memoryLimit).toBe("512m");
            expect(config.networkEnabled).toBe(false);
            expect(config.readonlyFs).toBe(true);
        });

        it("accepts custom limits", () => {
            const sandbox = new DockerSandbox({
                cpuLimit: "2.0",
                memoryLimit: "1g",
                networkEnabled: true,
            });
            const config = sandbox.getConfig();
            expect(config.cpuLimit).toBe("2.0");
            expect(config.memoryLimit).toBe("1g");
            expect(config.networkEnabled).toBe(true);
        });
    });

    describe("Container lifecycle", () => {
        it("starts in 'stopped' state", () => {
            const sandbox = new DockerSandbox({});
            expect(sandbox.state).toBe("stopped");
        });

        it("transitions to 'running' on start", () => {
            const sandbox = new DockerSandbox({});
            sandbox.simulateStart();
            expect(sandbox.state).toBe("running");
        });

        it("transitions to 'stopped' on stop", () => {
            const sandbox = new DockerSandbox({});
            sandbox.simulateStart();
            sandbox.simulateStop();
            expect(sandbox.state).toBe("stopped");
        });

        it("transitions to 'removed' on remove", () => {
            const sandbox = new DockerSandbox({});
            sandbox.simulateStart();
            sandbox.simulateStop();
            sandbox.simulateRemove();
            expect(sandbox.state).toBe("removed");
        });

        it("cannot start when removed", () => {
            const sandbox = new DockerSandbox({});
            sandbox.simulateStart();
            sandbox.simulateStop();
            sandbox.simulateRemove();
            expect(() => sandbox.simulateStart()).toThrow(/removed/i);
        });
    });

    describe("Docker commands", () => {
        it("builds docker run command", () => {
            const sandbox = new DockerSandbox({
                image: "agent-bridge:latest",
                cpuLimit: "1.0",
                memoryLimit: "512m",
            });
            const cmd = sandbox.buildRunCommand();
            expect(cmd).toContain("docker run");
            expect(cmd).toContain("--cpus=1.0");
            expect(cmd).toContain("--memory=512m");
            expect(cmd).toContain("agent-bridge:latest");
        });

        it("adds readonly flag", () => {
            const sandbox = new DockerSandbox({ readonlyFs: true });
            const cmd = sandbox.buildRunCommand();
            expect(cmd).toContain("--read-only");
        });

        it("adds network none when disabled", () => {
            const sandbox = new DockerSandbox({ networkEnabled: false });
            const cmd = sandbox.buildRunCommand();
            expect(cmd).toContain("--network=none");
        });

        it("adds volume mounts", () => {
            const sandbox = new DockerSandbox({
                volumes: ["/host/path:/container/path:ro"],
            });
            const cmd = sandbox.buildRunCommand();
            expect(cmd).toContain("-v /host/path:/container/path:ro");
        });
    });
});
