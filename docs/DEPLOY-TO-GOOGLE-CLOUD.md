# Deploy to Google Cloud Run

This guide deploys the full app (backend + React frontend) to **Google Cloud Run**. Service name: **californiahairsurgeon**.

## Prerequisites

1. **Google Cloud account** – [Console](https://console.cloud.google.com)
2. **gcloud CLI** – [Install](https://cloud.google.com/sdk/docs/install)
3. **MongoDB Atlas** – Database is external; ensure your cluster allows connections from anywhere (or add Cloud Run IPs to the allowlist when available)

## Full reset (clean slate)

If things are broken and you want to start from zero:

### 1. Delete Cloud Run services

In [Cloud Run](https://console.cloud.google.com/run):

- Delete **every** service tied to this project (surgassist, californiahairsurgeon, california-hair-surgeon, etc.)
- Click each service → **Delete**

### 2. Delete or disable Cloud Build triggers

In [Cloud Build → Triggers](https://console.cloud.google.com/cloud-build/triggers):

- Delete or disable the Auto-Deploy (and any other) triggers for this repo
- This stops automatic builds on push

### 3. (Optional) Clean old container images

In [Artifact Registry](https://console.cloud.google.com/artifacts) or [Container Registry](https://console.cloud.google.com/gcr):

- Delete images for `surgassist`, `californiahairsurgeon`, etc. — or leave them; they don't affect new deploys

### 4. Fresh deploy

1. Go to [Cloud Run](https://console.cloud.google.com/run) → **Create Service**
2. Choose **Continuously deploy from a repository** (or **Deploy from source**)
3. Connect your repo, branch `main`
4. **Build configuration:** Use a build config file → `cloudbuild.yaml`
5. **Service name:** `californiahairsurgeon`
6. **Region:** `us-central1`
7. **Variables & Secrets:** None required — config is hardcoded in `server/config.js`
8. Deploy

**Or deploy via CLI** (after deleting old services):
```bash
gcloud config set project YOUR_PROJECT_ID
gcloud builds submit --config=cloudbuild.yaml .
```
No env vars needed — config is in `server/config.js`. Edit `productionBaseUrl` there to match your Cloud Run URL.

### 5. Re-create the Cloud Build trigger (for CI/CD)

After the first deploy works:

1. [Cloud Build → Triggers](https://console.cloud.google.com/cloud-build/triggers) → **Create Trigger**
2. Source: your repo, branch `main`
3. Configuration: **Cloud Build configuration file** → `cloudbuild.yaml`
4. Save

---

## Should I delete everything? (normal case)

**No.** You typically don't need to delete anything. A new deploy creates a new revision. Only do a full reset if you're battling old config or broken state.

---

## Config (no .env)

All config is in `server/config.js` — MongoDB, Parse keys, dashboard credentials, and `productionBaseUrl`. Edit that file to change values. No Cloud Run env vars needed.

**If IAM error**, run:
```bash
gcloud run services add-iam-policy-binding californiahairsurgeon --region=us-central1 --member=allUsers --role=roles/run.invoker
```

## Cloud Build trigger (CI/CD)

The `cloudbuild.yaml` uses explicit Docker build + deploy (like kent-d365-connector), building from `Dockerfile.cloudrun` and deploying to service **californiahairsurgeon**.

1. Go to [Cloud Build → Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Create trigger → source: your repo, config: `cloudbuild.yaml`
3. Run the trigger — it builds and deploys. No env vars needed.

---

## Option B: Deploy from command line (manual)

## Step 1: Create a project (or use existing)

```bash
gcloud projects create YOUR_PROJECT_ID --name="Surg Assist"
gcloud config set project YOUR_PROJECT_ID
```

Or to use an existing project:

```bash
gcloud config set project YOUR_PROJECT_ID
```

## Step 2: Enable required APIs

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

## Step 3: Config

Edit `server/config.js` with your MongoDB URI, Parse keys, and `productionBaseUrl` (your Cloud Run URL). No env vars needed.

**Important:** `PARSE_SERVER_URL` and `CLIENT_URL` must use your final Cloud Run URL. On first deploy you can use a placeholder; after deployment, update the service with the correct URL and redeploy.

## Step 4: Deploy with Cloud Build

From the project root:

```bash
gcloud run deploy surgassist \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "MONGODB_URI=your_mongodb_uri" \
  --set-env-vars "PARSE_APP_ID=surgassist" \
  --set-env-vars "PARSE_MASTER_KEY=your_master_key" \
  --set-env-vars "PARSE_SERVER_URL=https://surgassist-XXXXX.run.app/parse" \
  --set-env-vars "CLIENT_URL=https://surgassist-XXXXX.run.app"
```

Or use a `.env` file (do not commit):

```bash
gcloud run deploy surgassist \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --env-vars-file .env.production
```

Cloud Build will:
1. Build the Docker image from the Dockerfile
2. Push it to Artifact Registry
3. Deploy to Cloud Run

## Step 5: Get your URL

After deployment:

```bash
gcloud run services describe surgassist --region us-central1 --format 'value(status.url)'
```

Use this URL for:
- `PARSE_SERVER_URL` = `https://YOUR_URL/parse`
- `CLIENT_URL` = `https://YOUR_URL`

## Step 6: Update env vars (if needed)

If you used placeholders on first deploy:

```bash
gcloud run services update surgassist \
  --region us-central1 \
  --set-env-vars "PARSE_SERVER_URL=https://YOUR_ACTUAL_URL/parse,CLIENT_URL=https://YOUR_ACTUAL_URL"
```

## Security notes

1. **PARSE_MASTER_KEY** – Generate a long random string (e.g. `openssl rand -base64 32`)
2. **MongoDB** – Use a strong password; consider IP allowlist if your Atlas plan supports it
3. **Parse Dashboard** – Only enable if needed; protect with a strong password

## Local production test

```bash
npm run build --prefix client
NODE_ENV=production node server/index.js
```

Visit http://localhost:5000 – the React app and API should both work.
