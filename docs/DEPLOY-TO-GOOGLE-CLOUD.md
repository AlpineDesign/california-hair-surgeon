# Deploy to Google Cloud Run

This guide deploys the full app (backend + React frontend) to **Google Cloud Run**.

## Prerequisites

1. **Google Cloud account** – [Console](https://console.cloud.google.com)
2. **gcloud CLI** – [Install](https://cloud.google.com/sdk/docs/install)
3. **MongoDB Atlas** – Database is external; ensure your cluster allows connections from anywhere (or add Cloud Run IPs to the allowlist when available)

---

## Option A: Deploy via Cloud Build trigger (CI/CD)

Once your repo is connected to Cloud Build:

1. **Create Artifact Registry repo** (one-time):
   ```bash
   gcloud artifacts repositories create cloud-run-source-deploy \
     --repository-format=docker --location=us-central1
   ```

2. **Create a build trigger**
   - Go to [Cloud Build → Triggers](https://console.cloud.google.com/cloud-build/triggers)
   - **Create trigger**
   - Name: `deploy-surgassist`
   - Event: Push to a branch
   - Source: your connected repo, branch `main` (or your default)
   - Configuration: **Cloud Build configuration file**
   - Location: `cloudbuild.yaml` (repo root)

3. **Add substitution variables** in the trigger (required for the app to start):
   - Edit the trigger → **Substitution variables**
   - Add these (replace with your real values):

   | Variable | Example |
   |----------|---------|
   | `_MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/surgassist` |
   | `_PARSE_MASTER_KEY` | Long random string (e.g. `openssl rand -base64 32`) |
   | `_PARSE_SERVER_URL` | `https://surgassist-XXXXX-uc.a.run.app/parse` (get URL from first deploy or Cloud Run console) |
   | `_CLIENT_URL` | `https://surgassist-XXXXX-uc.a.run.app` |

   **First deploy:** Use a temporary `_PARSE_SERVER_URL` and `_CLIENT_URL` (e.g. `https://surgassist.run.app`) so the app starts. After deploy, copy the real URL from Cloud Run, update the trigger variables, and run the trigger again.

4. **Run the trigger** – it will build and deploy.

5. **If IAM error** ("Setting IAM policy failed"), run:
   ```bash
   gcloud run services add-iam-policy-binding surgassist --region=us-central1 --member=allUsers --role=roles/run.invoker
   ```
   Or grant your Cloud Build service account the **Cloud Run Admin** and **Service Account User** roles.

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

## Step 3: Set environment variables

Create a `.env.production` (or use `gcloud run services update` secrets) with:

```env
# MongoDB Atlas (your connection string)
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/surgassist

# Parse Server
PARSE_APP_ID=surgassist
PARSE_MASTER_KEY=your_long_random_master_key
PARSE_SERVER_URL=https://YOUR_SERVICE_URL/parse

# CORS – use your Cloud Run URL after first deploy
CLIENT_URL=https://YOUR_SERVICE_URL

# Parse Dashboard (optional)
PARSE_DASHBOARD_USER=admin
PARSE_DASHBOARD_PASSWORD=secure_password
```

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
