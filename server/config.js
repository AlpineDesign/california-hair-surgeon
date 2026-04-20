// Hardcoded config (mirrors kent-d365-connector approach — no .env)
// Edit values below for your environment.
// PORT still comes from process.env for Cloud Run compatibility.
// Default 8080: matches client/src/api/client.js in dev; macOS reserves 5000 for AirPlay Receiver.
// WARNING: This file contains secrets. Do not commit if the repo is public.

const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 8080;

const productionBaseUrl = 'https://californiahairsurgeon-691066386045.us-central1.run.app';

module.exports = {
  port,
  isDevelopment: IS_DEVELOPMENT,

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

  // GCS file storage (for logo uploads). Set bucket empty to use GridFS (MongoDB).
  // Re-enable after first successful deploy and GCS bucket permissions are set.
  gcs: {
    bucket: '', // was: run-sources-california-hair-surgeon-us-central1
    projectId: 'california-hair-surgeon',
    keyFilename: undefined,
  },
};
