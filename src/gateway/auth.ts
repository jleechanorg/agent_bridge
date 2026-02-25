import type { Request, Response, NextFunction } from "express";
import { createLogger } from "../logger.js";

const log = createLogger("gateway/auth");

/**
 * Create an Express auth middleware that validates Bearer tokens.
 */
export function createAuthMiddleware(authToken: string | undefined) {
    return function authMiddleware(req: Request, res: Response, next: NextFunction): void {
        // Skip auth for health and UI endpoints
        if (req.path === "/health" || req.path === "/" || req.path.startsWith("/ui")) {
            next();
            return;
        }

        // If no auth token configured, allow all
        if (!authToken) {
            next();
            return;
        }

        const authorization = req.headers.authorization;
        if (!authorization) {
            log.debug("request rejected: no authorization header");
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const [scheme, token] = authorization.split(" ");
        if (scheme?.toLowerCase() !== "bearer" || token !== authToken) {
            log.debug("request rejected: invalid token");
            res.status(403).json({ error: "Forbidden" });
            return;
        }

        next();
    };
}
