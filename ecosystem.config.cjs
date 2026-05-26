/**
 * Recommended PM2 config for AWS Lightsail.
 * From repo root: pm2 start ecosystem.config.cjs && pm2 save
 */
module.exports = {
  apps: [
    {
      name: "api-server",
      cwd: "./artifacts/api-server",
      script: "dist/index.mjs",
      interpreter: "node",
      node_args: "--env-file=.env",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
    {
      name: "frontend",
      cwd: "./artifacts/shepherds-path",
      script: "serve.mjs",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
    },
  ],
};
