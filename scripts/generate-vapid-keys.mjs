#!/usr/bin/env node
/**
 * Generate VAPID key pair for Web Push (browser notifications).
 * Run on the server (or locally), then add output to artifacts/api-server/.env
 *
 *   node scripts/generate-vapid-keys.mjs
 *   pm2 restart api-server --update-env
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(__dirname, "../artifacts/api-server/package.json"));
const webpush = require("web-push");

const keys = webpush.generateVAPIDKeys();

console.log("");
console.log("# Add these lines to artifacts/api-server/.env on Lightsail:");
console.log("");
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log("VAPID_SUBJECT=mailto:admin@shepherdspathAI.com");
console.log("");
console.log("# Then restart:");
console.log("#   pm2 restart api-server --update-env");
console.log("# Verify: curl -s https://www.shepherdspathai.com/api/push/vapid-key");
console.log("");
