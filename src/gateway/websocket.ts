import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { createLogger } from "../logger.js";

const log = createLogger("gateway/ws");

export interface WsBroadcaster {
    broadcast: (event: string, payload: unknown) => void;
    close: () => void;
    clientCount: () => number;
}

/**
 * Attach a WebSocket server to an HTTP server for real-time event streaming.
 */
export function createWebSocketServer(httpServer: Server): WsBroadcaster {
    const wss = new WebSocketServer({ server: httpServer });

    wss.on("connection", (ws) => {
        log.debug("WebSocket client connected", { clients: wss.clients.size });

        ws.on("close", () => {
            log.debug("WebSocket client disconnected", { clients: wss.clients.size });
        });

        ws.on("error", (err) => {
            log.warn("WebSocket client error", { error: String(err) });
        });

        // Send a welcome message
        ws.send(JSON.stringify({
            event: "connected",
            data: { timestamp: Date.now() },
        }));
    });

    function broadcast(event: string, payload: unknown): void {
        const message = JSON.stringify({ event, data: payload });
        for (const client of wss.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }
    }

    function close(): void {
        wss.close();
    }

    function clientCount(): number {
        return wss.clients.size;
    }

    return { broadcast, close, clientCount };
}
