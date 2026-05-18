import "./env";

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function envBool(name: string): boolean {
  return process.env[name] === "true";
}

/** Typed configuration loaded from `.env` (dotenv) and process environment. */
export const config = {
  nodeEnv: env("NODE_ENV") ?? "development",
  port: Number(env("PORT")) || 3000,
  host: env("HOST") ?? "0.0.0.0",
  logLevel: env("LOG_LEVEL") ?? "info",

  databaseUrl: env("DATABASE_URL"),

  openaiApiKey: env("OPENAI_API_KEY"),
  aiIntegrationsOpenaiApiKey: env("AI_INTEGRATIONS_OPENAI_API_KEY"),
  aiIntegrationsOpenaiBaseUrl: env("AI_INTEGRATIONS_OPENAI_BASE_URL"),

  stripeSecretKey: env("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: env("STRIPE_WEBHOOK_SECRET"),

  resendApiKey: env("RESEND_API_KEY"),
  resendFromEmail: env("RESEND_FROM_EMAIL") ?? "onboarding@resend.dev",

  vapidPublicKey: env("VAPID_PUBLIC_KEY"),
  vapidPrivateKey: env("VAPID_PRIVATE_KEY"),
  vapidSubject: env("VAPID_SUBJECT") ?? "mailto:admin@shepherdspathAI.com",

  twilioAccountSid: env("TWILIO_ACCOUNT_SID"),
  twilioAuthToken: env("TWILIO_AUTH_TOKEN"),
  twilioPhoneNumber: env("TWILIO_PHONE_NUMBER"),

  appUrl: env("APP_URL"),
  welcomeVideoUrl: env("WELCOME_VIDEO_URL"),

  adminPassword: env("ADMIN_PASSWORD"),
  adminBypass: env("ADMIN_BYPASS"),

  enableEmailScheduler: envBool("ENABLE_EMAIL_SCHEDULER"),
  isReplitDeployment: env("REPLIT_DEPLOYMENT") === "1",

  replitConnectorsHostname: env("REPLIT_CONNECTORS_HOSTNAME"),
  replIdentity: env("REPL_IDENTITY"),
  webReplRenewal: env("WEB_REPL_RENEWAL"),
  replitDomains: env("REPLIT_DOMAINS"),

  unsplashAccessKey: env("UNSPLASH_ACCESS_KEY"),
  pexelsApiKey: env("PEXELS_API_KEY"),
  youtubeApiKey: env("YOUTUBE_API_KEY"),
  googleServiceAccountJson: env("GOOGLE_SERVICE_ACCOUNT_JSON"),

  androidPackageName: env("ANDROID_PACKAGE_NAME") ?? "com.shepherdspath.app",
  androidSha256Cert: env("ANDROID_SHA256_CERT"),

  promoCodes: env("PROMO_CODES"),

  get isProduction() {
    return this.nodeEnv === "production";
  },

  get hasOpenAI() {
    return !!(this.aiIntegrationsOpenaiApiKey || this.openaiApiKey);
  },

  get hasResend() {
    return !!(this.replitConnectorsHostname || this.resendApiKey);
  },

  get hasVapid() {
    return !!(this.vapidPublicKey && this.vapidPrivateKey);
  },

  get hasTwilio() {
    return !!(
      this.twilioAccountSid &&
      this.twilioAuthToken &&
      this.twilioPhoneNumber
    );
  },

  /** Run background schedulers on AWS VPS when ENABLE_EMAIL_SCHEDULER=true. */
  get shouldRunSchedulers() {
    return this.isReplitDeployment || this.enableEmailScheduler;
  },
} as const;

export function requireDatabaseUrl(): string {
  if (!config.databaseUrl) {
    throw new Error(
      "DATABASE_URL must be set. Copy .env.example to .env and configure your database.",
    );
  }
  return config.databaseUrl;
}
