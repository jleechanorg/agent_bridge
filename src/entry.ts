#!/usr/bin/env node
import process from "node:process";
import dotenv from "dotenv";
import { buildProgram } from "./cli/program.js";
import { formatError } from "./utils.js";

// Load .env file
dotenv.config({ path: ".env" });

process.title = "agent-gateway";

// Global error handlers
process.on("uncaughtException", (error) => {
    console.error("[agent-orchestrator] Uncaught exception:", formatError(error));
    process.exit(1);
});

process.on("unhandledRejection", (reason) => {
    console.error("[agent-orchestrator] Unhandled rejection:", formatError(reason));
});

const program = buildProgram();

void program.parseAsync(process.argv).catch((err) => {
    console.error("[agent-orchestrator] CLI failed:", formatError(err));
    process.exit(1);
});
