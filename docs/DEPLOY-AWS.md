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
4. When you’re ready to point the app at DocumentDB: add TLS (see **DocumentDB TLS** below), set `databaseURI` in `server/config.js`, commit, push. Until then you can keep **Atlas** in `databaseURI` for a first green deploy (open Atlas network access appropriately).

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
3. **Build settings**: **Use a Dockerfile** (container build).
4. **Dockerfile path**: `Dockerfile.cloudrun`.
5. **Runtime / service**:
   - **Port**: `8080`.
   - **Start command**: leave empty (image `CMD` already runs `node server/index.js`).
6. **Instance role**: attach **`surgassist-apprunner-instance`** from A4.
7. **Networking**: attach the **VPC connector** from A5.
8. **Automatic deployments**: enable if you want every push to rebuild.
9. Create the service and wait until it’s **Running**.

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

## DocumentDB TLS (when `databaseURI` points at DocumentDB)

DocumentDB requires TLS. Download the [RDS CA bundle](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html) (`global-bundle.pem`), add it to the repo (e.g. `server/certs/global-bundle.pem`), and in **`Dockerfile.cloudrun`** add:

`COPY server/certs/global-bundle.pem /app/global-bundle.pem`

Build `databaseURI` per [DocumentDB: connect programmatically](https://docs.aws.amazon.com/documentdb/latest/developerguide/connect_programmatically.html) (include `tls=true`, `tlsCAFile=/app/global-bundle.pem`, `replicaSet=rs0`, `readPreference=secondaryPreferred`, `retryWrites=false` as documented).

---

## Timeouts and scale

- Raise **request timeout** if you had long-running requests on Cloud Run.
- **Min instances** > 0 reduces cold starts (cost tradeoff).
