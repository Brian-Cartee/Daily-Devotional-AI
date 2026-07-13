import { spawn } from "node:child_process";

/**
 * Verify that ffmpeg can actually start and report a version.
 * Printing the configured binary path is not enough: missing ffmpeg otherwise
 * fails only after a user has completed a turn and Philip is ready to speak.
 */
export function checkFfmpegReady(opts = {}) {
  const ffmpegBin = opts.ffmpegBin || process.env.FFMPEG_PATH || "ffmpeg";
  const timeoutMs = Number(opts.timeoutMs || 3000);

  return new Promise((resolve) => {
    const startedAt = Date.now();
    let settled = false;
    let timer;
    let stdout = "";
    let stderr = "";

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        ffmpegBin,
        elapsedMs: Date.now() - startedAt,
        ...result,
      });
    };

    let proc;
    try {
      proc = spawn(ffmpegBin, ["-version"], { stdio: ["ignore", "pipe", "pipe"] });
    } catch (err) {
      finish({ ok: false, error: String(err) });
      return;
    }

    timer = setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {}
      finish({ ok: false, error: `ffmpeg readiness timed out after ${timeoutMs}ms` });
    }, timeoutMs);

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", (err) => finish({ ok: false, error: String(err) }));
    proc.on("close", (code) => {
      const firstLine = (stdout || stderr).split(/\r?\n/, 1)[0]?.trim() || "";
      finish({
        ok: code === 0 && /^ffmpeg version\s/i.test(firstLine),
        code,
        version: firstLine,
        error: code === 0 ? undefined : (stderr.trim() || `ffmpeg exited ${code}`),
      });
    });
  });
}
