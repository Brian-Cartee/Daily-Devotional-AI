/**
 * PM2 ecosystem for isolated Philip Voice Lab processes.
 *
 * Usage (on server, after adjusting PHILIP_LAB_ROOT):
 *   export PHILIP_LAB_ROOT=/opt/shepherdspath-philip-lab
 *   pm2 start deploy/philip-voice-lab/ecosystem.config.cjs
 *
 * Does NOT start or modify api-server / frontend.
 */
const PHILIP_LAB_ROOT = process.env.PHILIP_LAB_ROOT || "/opt/shepherdspath-philip-lab";
const API_CWD = `${PHILIP_LAB_ROOT}/artifacts/api-server`;

module.exports = {
  apps: [
    {
      name: "philip-lab-api",
      script: "dist/philip-lab-index.mjs",
      cwd: API_CWD,
      node_args: "--enable-source-maps",
      env_file: ".env.philip-lab",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "5s",
    },
    {
      name: "philip-voice-agent",
      script: "src/philip-voice-lab/agent.mjs",
      cwd: API_CWD,
      interpreter: "node",
      env_file: ".env.philip-lab",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "5s",
    },
  ],
};
