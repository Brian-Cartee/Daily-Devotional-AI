#!/usr/bin/env node
/** Minimal local server for PR1 tests (church routes only). */
import express from "express";
import { ensureChurchSchema } from "../src/churchMigrations.ts";
import { registerChurchRoutes } from "../src/church/routes.ts";

const port = Number(process.env.PR1_TEST_PORT || 18080);

await ensureChurchSchema();
console.log("[pr1-test] ensureChurchSchema ok");

const app = express();
app.use(express.json());
app.get("/api/health", (_req, res) => res.json({ ok: true }));
registerChurchRoutes(app);

app.listen(port, () => {
  console.log(`[pr1-test-server] listening on ${port}`);
});
