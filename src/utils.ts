export function formatError(err: unknown): string {
    if (err instanceof Error) {
        return err.stack ?? err.message;
    }
    return String(err);
}

export function waitForever(): Promise<void> {
    return new Promise<void>(() => {
        // intentionally never resolves
    });
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 3) + "...";
}

export function isTruthyEnv(value: string | undefined): boolean {
    if (!value) return false;
    return ["1", "true", "yes"].includes(value.toLowerCase().trim());
}
