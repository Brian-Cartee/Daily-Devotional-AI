#!/usr/bin/env node
/** Minimal local server for PR1 tests (no googleSheets / full routes). */
import express from "express";
import { ensureChurchSchema } from "../artifacts/api-server/src/churchMigrations.ts";
import { registerChurchRoutes } from "../artifacts/api-server/src/church/routes.ts";

const port = Number(process.env.PORT || 18080);

await ensureChurchSchema();
const app = express();
app.use(express.json());
app.get("/api/health", (_req, res) => res.json({ ok: true }));
registerChurchRoutes(app);

const server = app.listen(port, () => {
  console.log(`[pr1-test-server] listening on ${port}`);
});

process.on("SIGTERM", () => server.close());
