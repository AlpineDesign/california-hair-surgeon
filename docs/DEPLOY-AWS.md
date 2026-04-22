# Deploy on AWS (App Runner + DocumentDB + S3)

Monolith container: Express + Parse + static React (`Dockerfile.cloudrun`). Config and secrets stay in `server/config.js` (private repo).

---

## Path A — Console + GitHub (no Docker or AWS CLI on your laptop)

App Runner clones your repo and builds the image in AWS. You only use the **AWS Management Console** and **Git**.

### A0. Prereqs

1. Pick one **Region** (e.g. `us-east-1`) and use it for every service below.
2. Push your **`aws`** branch to GitHub so App Runner can see **`Dockerfile.cloudrun`**.

### A1. VPC

1. **VPC** → **Create VPC** → **VPC and more**.
2. Name it (e.g. `surgassist-vpc`), enable **DNS hostnames**, create **public + private** subnets and a **NAT gateway** (wizard default is fine).
3. Note which subnets are **private** (DocumentDB and the App Runner **VPC connector** use these).

### A2. Security groups

1. **`apprunner-connector-sg`** (for the VPC connector ENIs):
   - **Outbound**: allow all (default).
   - **Inbound**: nothing required for DocumentDB client traffic (outbound from app initiates).
2. **`docdb-sg`** (for the DocumentDB cluster):
   - **Inbound**: **TCP 27017**, source = **`apprunner-connector-sg`** (security group ID).

### A3. DocumentDB

1. **DocumentDB** → **Subnet groups** → create using the **private** subnets from A1.
2. Create a **cluster** (and instance). Note **cluster endpoint**, **master username**, **password**.
3. Attach **`docdb-sg`** to the cluster.
4. In **`server/config.js`**: set **`documentDbHost`**, **`documentDbUser`**, **`documentDbPassword`**, **`documentDbName`** (e.g. `parse`). The RDS CA file is **`server/certs/global-bundle.pem`** (already in repo). Set **`USE_DOCUMENTDB`** to **`true`**, commit, push. Until then leave **`USE_DOCUMENTDB: false`** and keep **Atlas**.
5. If auth fails, try removing **`authSource=admin`** from the URI builder in `config.js` or set it to the DB AWS documented for your user.

### A4. S3

1. **S3** → **Create bucket** in the same region.
2. **IAM** → **Roles** → **Create role** → trusted entity **AWS service** → **App Runner** → use case that creates the **instance / task** role App Runner can attach to running instances.
3. Add an **inline policy** allowing `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on `arn:aws:s3:::YOUR_BUCKET_NAME/*`.
4. Name it e.g. `surgassist-apprunner-instance`.
5. If `directAccess: true` in config, add a **bucket policy** (or prefix policy) so file URLs Parse returns are readable—tighten to a prefix like `parse/*` when you can.

### A5. VPC connector (App Runner)

1. **App Runner** → **VPC connectors** → **Create**.
2. Choose **VPC**, **private subnets**, security group **`apprunner-connector-sg`**.
3. Finish and note the connector name.

### A6. App Runner service (GitHub)

1. **App Runner** → **Create service**.
2. **Source**: **Source code repository** → **GitHub** → connect the AWS GitHub app → choose **repository** and branch (**`aws`**).
3. **Build settings:** many consoles only list **managed** runtimes (Node, Python, …)—**no Docker**. Use one of:
   - **Use a configuration file** (recommended): commit **`apprunner.yaml`** at the repo root (Node 22: install server deps, build `client/`, run `node server/index.js`). Then select this option and continue.
   - **Configure all settings here** → **Runtime: Nodejs 22** → **Build:** `npm install --omit=dev && cd client && npm install && npm run build && cd ..` → **Start:** `node server/index.js` → **Port:** `8080`. (Not `node server.js`.)
   - If your UI offers **Docker**, you can use **Dockerfile** path `Dockerfile.cloudrun` and empty start command instead.
4. **Instance role**: attach **`surgassist-apprunner-instance`** from A4.
5. **Networking**: attach the **VPC connector** from A5.
6. **Automatic deployments**: enable if you want every push to rebuild.
7. Create the service and wait until it’s **Running**.

### A7. Config URL + S3 bucket name

1. Copy the service **default URL** (HTTPS, **no trailing slash**).
2. In `server/config.js`: set **`productionBaseUrl`** to that URL; set **`s3.bucket`** and **`s3.region`**.
3. Commit and push; if auto-deploy is on, App Runner rebuilds.

### A8. Cutover checklist

- [ ] Login and main flows work.
- [ ] Logo upload works; file URLs load.
- [ ] `/parse` works; `/dashboard` if you use it.

---

## Path B — ECR + local Docker / CLI (optional)

If you prefer to build and push images yourself:

```bash
aws ecr create-repository --repository-name surgassist --region us-east-1
docker build -f Dockerfile.cloudrun -t surgassist:latest .
# tag + push per ECR console instructions
```

Create an App Runner service from the **ECR** image instead of GitHub. Same port **8080**, instance role, and VPC connector as Path A.

---

## DocumentDB TLS

TLS uses **`server/certs/global-bundle.pem`** (AWS [global bundle](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html)). **`server/config.js`** builds `tlsCAFile` with `path.join(__dirname, 'certs', 'global-bundle.pem')` so it works locally and on App Runner (`/app/server/...`).

Container-only deploys: ensure the PEM is copied in the image (root **`Dockerfile.cloudrun`** already copies all of **`server/`**).

---

## Timeouts and scale

- Raise **request timeout** if you had long-running requests on Cloud Run.
- **Min instances** > 0 reduces cold starts (cost tradeoff).
