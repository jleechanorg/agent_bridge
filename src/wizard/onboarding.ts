/**
 * Wizard — Interactive onboarding (types only for MVP).
 */

export interface OnboardingConfig {
    cli: string;
    workspace: string;
    authToken: string;
    port: number;
}

export interface OnboardingStep {
    name: string;
    prompt: string;
    validate: (input: string) => boolean;
    defaultValue?: string;
}

export const onboardingSteps: OnboardingStep[] = [
    {
        name: "cli",
        prompt: "Which agent CLI? (claude/codex/gemini/cursor)",
        validate: (v) => ["claude", "codex", "gemini", "cursor"].includes(v),
        defaultValue: "claude",
    },
    {
        name: "workspace",
        prompt: "Workspace directory",
        validate: (v) => v.length > 0,
        defaultValue: ".",
    },
    {
        name: "authToken",
        prompt: "API auth token",
        validate: (v) => v.length >= 8,
    },
    {
        name: "port",
        prompt: "Gateway port",
        validate: (v) => !isNaN(Number(v)) && Number(v) > 0,
        defaultValue: "19876",
    },
];

export function buildConfigYaml(config: OnboardingConfig): string {
    return [
        "gateway:",
        `  port: ${config.port}`,
        `  host: 127.0.0.1`,
        "",
        "agent:",
        `  cli: ${config.cli}`,
        `  workspace: ${config.workspace}`,
        "",
        `auth_token: ${config.authToken}`,
    ].join("\n");
}
