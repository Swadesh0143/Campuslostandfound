# CampusFind — College Viva Voce & Technical Defense Guide

This comprehensive guide prepares engineering students and cloud architects to defend the design, implementation, and cloud deployment of **CampusFind** in university examinations and technical reviews.

---

## 1. Cloud Computing Core Concepts Demonstrated

### Q1: What cloud computing service model and deployment model does CampusFind represent?
**Answer:**
- **Service Model:** CampusFind utilizes a **Serverless Function-as-a-Service (FaaS)** and **Backend-as-a-Service (BaaS)** architecture. Instead of managing operating systems or virtual machines (IaaS), we leverage managed cloud building blocks (AWS Lambda for compute, DynamoDB for database, S3 for object storage, and Cognito for identity).
- **Deployment Model:** It is deployed on a **Public Cloud (Amazon Web Services)** within a secure, multi-tenant virtual cloud infrastructure using Infrastructure-as-Code (IaC via AWS SAM / CloudFormation).

### Q2: What are the primary advantages of Serverless over traditional server-based (EC2/VM) architectures for a university campus system?
**Answer:**
1. **Zero Idle Cost:** University activity has extreme traffic peaks (start of semester, exam week) and quiet periods (nights, summer vacations). Virtual servers run 24/7 incurring hourly compute costs even when idle. Serverless compute charges strictly per millisecond of execution.
2. **Automatic Horizontal Elasticity:** When thousands of students simultaneously search for lost belongings after a campus festival, AWS Lambda dynamically instantiates parallel execution environments without manual autoscaling groups.
3. **No OS/Server Patching Overhead:** Operating system maintenance, security patches, kernel updates, and runtime upgrades are handled automatically by AWS.
4. **High Availability Built-in:** Services like DynamoDB and S3 automatically replicate data across at least three Availability Zones (AZs) in the region.

---

## 2. Deep-Dive into AWS Services & Architecture Choices

### Q3: Why is Amazon DynamoDB used instead of a relational database like Amazon RDS MySQL or PostgreSQL?
**Answer:**
1. **Provisioning & Cost Model:** An RDS instance requires a running database instance that costs at minimum $15–$30/month even at idle. DynamoDB with `PAY_PER_REQUEST` (On-Demand capacity) costs exactly $0.00 when idle and provides 25 read/write capacity units free.
2. **Document Model Fit:** Lost and found items have semi-structured attributes (e.g., categories have varying details, optional image keys, status metadata). DynamoDB natively supports JSON document schemas.
3. **Predictable Single-Digit Millisecond Latency:** Key-value lookups by `itemId` take under 5ms regardless of how many records exist.
4. **Global Secondary Indexes (GSIs):** Our implementation uses two GSIs (`StatusCreatedAtIndex` and `TypeCreatedAtIndex`) to allow filtering by status and type sorted by timestamp without expensive table scans.

### Q4: Why is Amazon S3 used, and why are photographs NOT stored directly in DynamoDB?
**Answer:**
- DynamoDB has a strict **400 KB per-item size limit** and charges for Read/Write Capacity Units in 1 KB / 4 KB increments. Storing large binary images (1MB to 5MB) in DynamoDB would immediately exceed size limits and dramatically inflate database costs.
- Amazon S3 is purpose-built for unlimited unstructured object storage at fractions of a cent per gigabyte ($0.023/GB/month).
- DynamoDB stores only the metadata and the unique S3 object key (`imageKey: "uploads/1729600000-xyz.jpg"`).

### Q5: What role does Amazon API Gateway play? Why can't the frontend invoke Lambda directly?
**Answer:**
1. **Public HTTP Protocol Bridge:** Browsers communicate over standard HTTPS. API Gateway translates standard web HTTP requests (`GET /items`, `POST /items`) into structured JSON event payloads passed to Lambda functions.
2. **Cross-Origin Resource Sharing (CORS):** API Gateway intercepts and responds to browser preflight `OPTIONS` requests, enforcing allowed origins, methods, and headers.
3. **Security Perimeter & Rate Limiting:** API Gateway protects backend Lambda functions against denial-of-service (DoS) attacks by throttling excessive requests and rejecting payloads exceeding size limits before compute resources are consumed.
4. **Decoupling & URL Routing:** API Gateway provides a clean, versioned RESTful URL structure independent of the underlying Lambda execution handlers.

### Q6: How does AWS IAM (Identity and Access Management) enforce the principle of least privilege in CampusFind?
**Answer:**
- **Execution Role:** The Lambda function is assigned a dedicated IAM execution role (`AWS::IAM::Role`).
- **Least-Privilege Scoping:**
  - The function is granted DynamoDB permissions (`GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`, `Query`, `Scan`) **strictly restricted** to the ARNs of `CampusFind-Items`, `CampusFind-Ownership`, `CampusFind-AbuseReports`, and their secondary indexes.
  - S3 permissions (`PutObject`, `GetObject`, `DeleteObject`) are restricted specifically to `arn:aws:s3:::campusfind-images-*/*`.
  - The browser client is never issued IAM credentials or API keys.

### Q7: How does Amazon Cognito handle administrator authentication, and why is it separated from public reporting?
**Answer:**
- CampusFind does not force general students to create accounts to report lost items. However, administrative capabilities (moderating flagged reports, hiding offensive listings, reviewing abuse reports) require strict authentication.
- Amazon Cognito User Pool provides an enterprise identity store with:
  - Secure password hashing (SRP - Secure Remote Password protocol).
  - Configurable password complexity rules (minimum 8 characters, lowercase, uppercase, numbers).
  - Public self-registration disabled (`AllowAdminCreateUserOnly: true`) so random users cannot self-register as administrators.
  - JWT (JSON Web Token) issuance verified server-side on all `/admin/*` API endpoints.

### Q8: How does Amazon CloudWatch contribute to reliability and cost control?
**Answer:**
- **Structured Telemetry:** Every API request, error, and database operation generates structured logs streamed to CloudWatch Log Groups.
- **Cost Safeguard:** CloudWatch log storage is configured with an explicit **14-day retention limit** (`RetentionInDays: 14`). Without this setting, logs accumulate indefinitely, causing unexpected recurring storage charges on student accounts.

---

## 3. Security, Privacy & Cryptographic Engineering

### Q9: Explain the Cryptographic Report Ownership model. How can students manage their reports without an account?
**Answer:**
1. **Entropy Generation:** When an item is created via `POST /items`, the Lambda backend calls `crypto.randomBytes(32)` to generate a 256-bit cryptographically secure token, along with a 16-byte random salt.
2. **Hashed Persistence:** The backend computes `tokenHash = SHA256(rawToken + salt)`. Only `tokenHash` and `salt` are stored in the private DynamoDB table `CampusFind-Ownership`.
3. **One-Time Disclosure:** The raw token is returned to the user in the HTTP response **exactly once**.
4. **Timing-Safe Comparison:** When the user updates the status (e.g., `PATCH /items/:id/status` to mark as returned), they pass header `X-Management-Token: <rawToken>`. The backend recalculates the SHA-256 hash and compares it using `crypto.timingSafeEqual()`. Constant-time comparison prevents attackers from guessing the token by measuring execution latency differences.
5. **Brute-Force Lockout:** If 5 failed attempts are logged, the backend locks the item for 1 hour.

### Q10: How are S3 image uploads protected against malicious file uploads and bandwidth abuse?
**Answer:**
1. **Presigned PUT Authorization:** The browser never uploads files directly to an open bucket. It must first call `POST /uploads/presign` with the intended MIME type and file size.
2. **Whitelisted MIME Types:** The backend validates that the MIME type is strictly `image/jpeg`, `image/png`, or `image/webp`. Executables, scripts (`.exe`, `.sh`, `.php`), and HTML files are rejected.
3. **Size Ceiling:** Uploads are capped at a maximum of 5MB.
4. **Server-Generated Unique Keys:** The browser cannot specify an arbitrary S3 key path. The server generates a collision-resistant key: `uploads/${timestamp}-${random}.${ext}`.
5. **Short Expiration:** The presigned URL expires automatically after 5 minutes (300 seconds).

### Q11: How does CampusFind protect student contact privacy?
**Answer:**
- In public listing queries (`GET /items`) and item details (`GET /items/{itemId}`), the private field `contactMethod` (phone number, personal email) is completely stripped before the JSON payload is transmitted.
- Contact information is only returned when a user explicitly initiates an inquiry via `GET /contact/{itemId}`.
- This endpoint enforces status checks (returns HTTP 410 if the item is already returned or archived) and displays campus safety guidelines reminding students to meet in public, monitored areas.

### Q12: How does the QR Code feature work, and is any private information encoded?
**Answer:**
- The QR code is generated entirely client-side using `qrcode.react`.
- It encodes **strictly the public item URL** (e.g. `https://<domain>/items/<itemId>`).
- It **never** contains management tokens, reporter emails, phone numbers, or administrative links.
- Students can download the QR code as a PNG poster to print and post on physical campus notice boards.

---

## 4. Scalability, Cost Optimization & Budget Management

### Q13: How does the application scale to handle sudden spikes in campus activity?
**Answer:**
- **Frontend:** Static HTML/JS/CSS assets are cached and distributed globally through AWS edge locations (Amplify / CloudFront CDN), meaning millions of page loads hit edge caches without stressing origin servers.
- **Compute:** AWS Lambda concurrently scales up to thousands of function instances within milliseconds to absorb request spikes.
- **Database:** DynamoDB On-Demand capacity instantly allocates throughput capacity as traffic scales without provisioning partitions manually.

### Q14: How does this project safeguard student promotional AWS credits ($200 budget)?
**Answer:**
- **No Idle Infrastructure:** No NAT Gateways ($32/month each), no EC2 instances ($15+/month), no RDS databases ($15+/month), and no provisioned DynamoDB capacity.
- **Pay-Per-Request Compute & Storage:** Total estimated monthly cost at low/moderate campus volume is **under $1.00/month**.
- **Log Retention Policy:** CloudWatch logs expire after 14 days.
- **S3 Multipart Lifecycle:** Incomplete S3 multipart uploads automatically abort after 1 day.

---

## 5. Summary Cheat Sheet for Examiners

| Examiner Question | Core Keyphrases to State |
|---|---|
| *Architecture style?* | **Serverless event-driven architecture with FaaS and BaaS on AWS.** |
| *How are photos uploaded?* | **Direct-to-S3 presigned PUT URLs with 5-minute expiry, 5MB limit, and MIME checks.** |
| *How is report ownership verified without login?* | **256-bit cryptographically random tokens, salted SHA-256 hash stored in DynamoDB, verified using timing-safe comparison (`crypto.timingSafeEqual`).** |
| *Why DynamoDB?* | **Zero idle cost (On-Demand billing), single-digit millisecond latency, JSON document flexibility, multi-AZ replication.** |
| *How is contact privacy preserved?* | **Contact information is stripped from public feeds and only revealed via an explicit, rate-aware contact endpoint.** |
| *How are cloud costs controlled?* | **100% serverless, zero provisioned hourly instances, 14-day CloudWatch log retention, estimated cost < $1.00/month.** |
