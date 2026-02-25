import { describe, it, expect } from "vitest";
import { createAuthMiddleware } from "../../src/gateway/auth.js";
import type { Request, Response, NextFunction } from "express";

function mockReq(path: string, authorization?: string): Partial<Request> {
    return {
        path,
        headers: authorization ? { authorization } : {},
    };
}

function mockRes(): Partial<Response> & { statusCode: number; body: unknown } {
    const res = {
        statusCode: 200,
        body: null as unknown,
        status(code: number) {
            res.statusCode = code;
            return res;
        },
        json(data: unknown) {
            res.body = data;
            return res;
        },
    };
    return res as Partial<Response> & { statusCode: number; body: unknown };
}

describe("Auth Middleware", () => {
    it("should skip auth for /health", () => {
        const middleware = createAuthMiddleware("secret-token");
        const req = mockReq("/health");
        const res = mockRes();
        let nextCalled = false;

        middleware(req as Request, res as unknown as Response, (() => { nextCalled = true; }) as NextFunction);

        expect(nextCalled).toBe(true);
    });

    it("should skip auth for / (dashboard)", () => {
        const middleware = createAuthMiddleware("secret-token");
        const req = mockReq("/");
        const res = mockRes();
        let nextCalled = false;

        middleware(req as Request, res as unknown as Response, (() => { nextCalled = true; }) as NextFunction);

        expect(nextCalled).toBe(true);
    });

    it("should skip auth for /ui paths", () => {
        const middleware = createAuthMiddleware("secret-token");
        const req = mockReq("/ui/styles.css");
        const res = mockRes();
        let nextCalled = false;

        middleware(req as Request, res as unknown as Response, (() => { nextCalled = true; }) as NextFunction);

        expect(nextCalled).toBe(true);
    });

    it("should allow all when no auth token configured", () => {
        const middleware = createAuthMiddleware(undefined);
        const req = mockReq("/api/status");
        const res = mockRes();
        let nextCalled = false;

        middleware(req as Request, res as unknown as Response, (() => { nextCalled = true; }) as NextFunction);

        expect(nextCalled).toBe(true);
    });

    it("should reject when no authorization header", () => {
        const middleware = createAuthMiddleware("secret-token");
        const req = mockReq("/api/status");
        const res = mockRes();
        let nextCalled = false;

        middleware(req as Request, res as unknown as Response, (() => { nextCalled = true; }) as NextFunction);

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(401);
    });

    it("should reject when token is wrong", () => {
        const middleware = createAuthMiddleware("secret-token");
        const req = mockReq("/api/status", "Bearer wrong-token");
        const res = mockRes();
        let nextCalled = false;

        middleware(req as Request, res as unknown as Response, (() => { nextCalled = true; }) as NextFunction);

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(403);
    });

    it("should allow when token matches", () => {
        const middleware = createAuthMiddleware("secret-token");
        const req = mockReq("/api/status", "Bearer secret-token");
        const res = mockRes();
        let nextCalled = false;

        middleware(req as Request, res as unknown as Response, (() => { nextCalled = true; }) as NextFunction);

        expect(nextCalled).toBe(true);
    });

    it("should reject non-Bearer schemes", () => {
        const middleware = createAuthMiddleware("secret-token");
        const req = mockReq("/api/status", "Basic secret-token");
        const res = mockRes();
        let nextCalled = false;

        middleware(req as Request, res as unknown as Response, (() => { nextCalled = true; }) as NextFunction);

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(403);
    });
});
