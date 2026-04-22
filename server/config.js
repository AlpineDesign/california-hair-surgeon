// Hardcoded config (mirrors kent-d365-connector approach — no .env)
// Edit values below for your environment.
// PORT still comes from process.env (Cloud Run, App Runner, ECS, etc.).
// Default 8080: matches client/src/api/client.js in dev; macOS reserves 5000 for AirPlay Receiver.
// WARNING: This file contains secrets. Do not commit if the repo is public.

const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 8080;

// No trailing slash. Set to your AWS service URL when live (or keep during GCP→AWS migration).
const productionBaseUrl = 'https://californiahairsurgeon-691066386045.us-central1.run.app';

module.exports = {
  port,
  isDevelopment: IS_DEVELOPMENT,

  /** When true, POST /api/app-test/purge-account can wipe all data for the signed-in account (owner only). */
  enableAppTestHarness:
    process.env.ENABLE_APP_TEST_HARNESS === '1' ||
    process.env.ENABLE_APP_TEST_HARNESS === 'true',

  // Atlas today; swap for Amazon DocumentDB URI when the cluster is ready (TLS + retryWrites params per AWS docs).
  databaseURI: 'mongodb+srv://admin:ZI1ubBPvRsbuMWu0@base.ptixesf.mongodb.net/?appName=base',

  parse: {
    appId: 'californiaHarSurgeon',
    masterKey: 'sk_live_MWrJ5HbowOzbTcNnt0bMazqGaXj8D4w5',
    serverURL: IS_DEVELOPMENT ? `http://localhost:${port}/parse` : `${productionBaseUrl}/parse`,
    // Parse defaults to masterKey only from localhost; that breaks when the Node SDK calls the public URL (e.g. Cloud Run).
    // Master key is already a strong secret; allow from any IP = disable IP allowlist (both stacks per Parse docs).
    masterKeyIps: ['0.0.0.0/0', '::/0'],
  },

  clientUrl: IS_DEVELOPMENT ? 'http://localhost:3000' : productionBaseUrl,

  dashboard: {
    user: 'info@alpine.design',
    pass: 'Fergburger<3',
  },

  // S3 via @parse/s3-files-adapter (logo uploads = Parse.File). Leave bucket empty to use GridFS in MongoDB.
  // On App Runner / ECS / Fargate, attach an IAM role with s3:PutObject/GetObject/DeleteObject on this bucket
  // and omit accessKey / secretKey. For local dev you can set keys here or use ~/.aws/credentials.
  s3: {
    bucket: '',
    region: 'us-east-1',
    directAccess: true,
    bucketPrefix: '',
    accessKey: '',
    secretKey: '',
  },
};
