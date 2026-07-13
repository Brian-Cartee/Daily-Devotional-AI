import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { rm } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

async function buildPhilipLab() {
  const outFile = path.resolve(artifactDir, "dist/philip-lab-index.mjs");

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/philip-lab-server/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: outFile,
    logLevel: "info",
    external: [
      "*.node",
      "livekit-server-sdk",
      "@livekit/rtc-node",
    ],
  });

  console.log(`[build:philip-lab] wrote ${outFile}`);
}

buildPhilipLab().catch((err) => {
  console.error(err);
  process.exit(1);
});
