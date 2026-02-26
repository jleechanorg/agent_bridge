/**
 * Test configuration for testing_llm/ — adapted from testing_http/test_config.py
 */

export const BASE_URL = process.env.GATEWAY_URL ?? "http://127.0.0.1:19899";
export const AUTH_TOKEN = process.env.AUTH_TOKEN ?? "e2e-test-token-12345";

export function getAuthHeaders(): Record<string, string> {
    return {
        "Authorization": `Bearer ${AUTH_TOKEN}`,
        "Content-Type": "application/json",
    };
}

export async function waitForServer(timeoutMs = 10000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const res = await fetch(`${BASE_URL}/health`);
            if (res.ok) return true;
        } catch { /* server not up yet */ }
        await new Promise((r) => setTimeout(r, 250));
    }
    return false;
}
