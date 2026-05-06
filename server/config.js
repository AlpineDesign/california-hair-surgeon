const path = require('path');

// Hardcoded config (mirrors kent-d365-connector approach — no .env file for DB).
// WARNING: secrets below — do not commit if the repo is public.
//
// isDocumentDb: false = local testing (Atlas + localhost URLs). true = AWS (DocumentDB + production URLs).
// useLocalMongo: true = mongod on 127.0.0.1:27017 only (overrides DB choice below).

/** AWS / DocumentDB and production URLs. Set false for local Atlas testing. */
const isDocumentDb = true;

const port = process.env.PORT || 8080;

/** Set true only when you have MongoDB listening on 127.0.0.1:27017 (otherwise use Atlas when isDocumentDb is false). */
const useLocalMongo = false;

// No trailing slash (avoids //parse and CORS mismatches).
//const productionBaseUrl = 'https://csmykg2r38.us-east-1.awsapprunner.com'.replace(/\/$/, '');
const productionBaseUrl = 'https://v2.surgassist.tech'.replace(/\/$/, '');

const atlasDatabaseURI =
  'mongodb+srv://admin:ZI1ubBPvRsbuMWu0@base.ptixesf.mongodb.net/?appName=base';

// Amazon DocumentDB — fill from console (cluster endpoint, master user, password). TLS uses bundled RDS CA PEM.
const documentDbHost =
  'surgassist-mongo.cluster-cir4qgeok8id.us-east-1.docdb.amazonaws.com';
const documentDbUser = 'surgassist';
const documentDbPassword = '737a9a17-a17f-49a4-b89f-5540544703eb';
/** Logical DB name on DocumentDB. Atlas dump uses DB name `test`; restore with --nsFrom/--nsTo (see docs/DEPLOY-AWS.md). */
const documentDbName = 'parse';

function buildDocumentDatabaseURI() {
  const tlsCAFile = path.join(__dirname, 'certs', 'global-bundle.pem');
  const user = encodeURIComponent(documentDbUser);
  const pass = encodeURIComponent(documentDbPassword);
  const ca = encodeURIComponent(tlsCAFile);
  return (
    `mongodb://${user}:${pass}@${documentDbHost}:27017/${documentDbName}` +
    `?tls=true&tlsCAFile=${ca}&replicaSet=rs0&readPreference=secondaryPreferred` +
    `&retryWrites=false&authSource=admin`
  );
}

const localDatabaseURI = 'mongodb://127.0.0.1:27017/parse';

const databaseURI = useLocalMongo
  ? localDatabaseURI
  : isDocumentDb
    ? buildDocumentDatabaseURI()
    : atlasDatabaseURI;

module.exports = {
  port,
  isDevelopment: !isDocumentDb,

  /** True when this deploy uses Amazon DocumentDB (URLs + Parse collation workaround). */
  isDocumentDb,

  /** True when URI is Amazon DocumentDB (Parse collation workaround). */
  useDocumentDb: !useLocalMongo && isDocumentDb,

  /** Same URI used when `isDocumentDb` is true; for `mongorestore` from a host that can reach the cluster. */
  getDocumentDbUri: buildDocumentDatabaseURI,

  /** When true, POST /api/app-test/purge-account can wipe all data for the signed-in account (owner only). */
  enableAppTestHarness:
    process.env.ENABLE_APP_TEST_HARNESS === '1' ||
    process.env.ENABLE_APP_TEST_HARNESS === 'true',

  databaseURI,

  parse: {
    appId: 'californiaHarSurgeon',
    masterKey: 'sk_live_MWrJ5HbowOzbTcNnt0bMazqGaXj8D4w5',
    serverURL: isDocumentDb ? `${productionBaseUrl}/parse` : `http://localhost:${port}/parse`,
    // Parse defaults to masterKey only from localhost; that breaks when the Node SDK calls the public URL (e.g. Cloud Run).
    // Master key is already a strong secret; allow from any IP = disable IP allowlist (both stacks per Parse docs).
    masterKeyIps: ['0.0.0.0/0', '::/0'],
  },

  clientUrl: isDocumentDb ? productionBaseUrl : 'http://localhost:3000',

  dashboard: {
    user: 'info@alpine.design',
    pass: 'Fergburger<3',
  },

  // S3 via @parse/s3-files-adapter (logo uploads = Parse.File). Leave bucket empty to use GridFS in MongoDB.
  // On App Runner / ECS / Fargate, attach an IAM role with s3:PutObject/GetObject/DeleteObject on this bucket
  // and omit accessKey / secretKey. For local dev you can set keys here or use ~/.aws/credentials.
  s3: {
    bucket: 'surgassist-files',
    region: 'us-east-1',
    directAccess: true,
    bucketPrefix: '',
    accessKey: '',
    secretKey: '',
  },
};
