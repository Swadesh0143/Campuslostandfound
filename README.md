# CampusFind — Cloud-Based Campus Lost & Found System

> **"Lost something? Let's find it."**  
> An enterprise-grade, 100% serverless web application engineered for university campuses to report, track, and recover lost personal belongings with cryptographic report ownership, contact privacy guards, and automated QR poster generation.

---

## 1. Project Overview & Problem Statement

### The Problem
On university campuses, lost and found workflows are traditionally fragmented across WhatsApp groups, Telegram channels, Instagram stories, physical notice boards, and departmental lost-and-found boxes. This leads to:
- **Low recovery rates**: Posts get buried quickly in student chat groups.
- **Privacy violations**: Students publicly post phone numbers, personal email addresses, or photographs of student IDs containing private ID numbers.
- **Friction**: Traditional reporting apps require students to create accounts, verify emails, and remember passwords before submitting a quick 30-second report.
- **Unauthorized tampering**: Unprotected public edit links allow anyone to modify or delete someone else's listing.

### The CampusFind Solution
CampusFind solves these challenges by combining:
1. **Frictionless No-Login Reporting**: Students can file reports in seconds without creating an account.
2. **Cryptographically Secure Report Ownership**: The backend generates a 256-bit cryptographically random token (`crypto.randomBytes(32)`). Only the SHA-256 hash and salt are persisted in DynamoDB. Reports can be updated, marked as recovered, or deleted using constant-time comparison (`crypto.timingSafeEqual`).
3. **Contact Privacy Guard**: Public listing and search endpoints strictly strip personal contact details. Contact info is only revealed via an explicit action with campus safety guidelines.
4. **Physical Campus QR Posters**: Automatic QR code generator encoding only public URLs for physical bulletin boards and flyers.
5. **Zero-Idle-Cost AWS Serverless Architecture**: Powered by AWS Lambda, API Gateway HTTP API, DynamoDB On-Demand, S3 private buckets, and Amazon Cognito. Estimated run cost is **<$1.00/month**, safely preserving student promotional AWS credits.

---

## 2. Architecture Diagram & Data Flow

```mermaid
flowchart TD
    subgraph ClientLayer [Client Browser Tier]
        UserApp[React 18 + Vite SPA\nTailwind CSS + Lucide Icons]
        StaffPortal[Admin Moderation Portal]
    end

    subgraph AWSCloud [AWS Serverless Infrastructure]
        APIGW[Amazon API Gateway\nHTTP API v2 with CORS]
        S3Bucket[(Amazon S3 Private Bucket\nEncrypted Images + Block Public Access)]
        CognitoPool[Amazon Cognito User Pool\nStaff Authentication]
        CloudWatch[Amazon CloudWatch\n14-Day Log Retention]
        
        subgraph ComputeLayer [AWS Lambda Compute Tier]
            LambdaRouter[CampusFind Unified Lambda Router\nNode.js 20.x + AWS SDK v3]
            ItemsModule[Items Handler]
            UploadModule[S3 Presigner Module]
            ManageModule[Ownership & Status Handler]
            ContactModule[Contact Privacy Handler]
            AdminModule[Admin Moderation Handler]
        end

        subgraph DatabaseLayer [Amazon DynamoDB (On-Demand)]
            ItemsTable[(CampusFind-Items\nPK: itemId)]
            OwnershipTable[(CampusFind-Ownership\nPK: itemId)]
            ReportsTable[(CampusFind-AbuseReports\nPK: reportId)]
        end
    end

    UserApp -->|1. Request Presigned URL| APIGW
    APIGW --> LambdaRouter
    LambdaRouter --> UploadModule
    UploadModule -.->|Generate Presigned PUT URL| S3Bucket
    UserApp -->|2. Direct Upload via PUT URL| S3Bucket
    UserApp -->|3. POST /items with imageKey| APIGW
    LambdaRouter --> ItemsModule
    ItemsModule -->|Store Item Record| ItemsTable
    ItemsModule -->|Store Token Hash + Salt| OwnershipTable
    ItemsModule -.->|Return One-Time Raw Token| UserApp

    UserApp -->|PATCH /items/:id/status + X-Management-Token| APIGW
    LambdaRouter --> ManageModule
    ManageModule -->|Validate Token via timingSafeEqual| OwnershipTable
    ManageModule -->|Update Status to returned/archived| ItemsTable

    StaffPortal -->|Bearer Token Auth| APIGW
    LambdaRouter --> AdminModule
    AdminModule -.->|Validate JWT| CognitoPool
    AdminModule --> ReportsTable
    AdminModule --> ItemsTable

    LambdaRouter -.->|Execution Logs| CloudWatch
```

---

## 3. Technology Stack & Service Responsibilities

| Tier / Component | Technology | Responsibility |
|---|---|---|
| **Frontend Framework** | React 18, Vite | Responsive Single Page Application (SPA), component architecture, fast HMR |
| **Styling & Icons** | Tailwind CSS, Lucide React | Modern campus-community aesthetic, color tokens, accessible UI focus rings |
| **Routing** | React Router v6 | Client-side routing (`/`, `/items`, `/report/lost`, `/report/found`, `/items/:id`, `/manage/:id`, `/admin`, `/about`) |
| **Micro-Interactions** | Canvas Confetti, QRCodeSVG | Celebration confetti on recovery, downloadable vector/canvas QR posters |
| **API Gateway** | Amazon API Gateway HTTP API v2 | High-throughput, low-cost HTTP routing, CORS preflight, payload validation |
| **Compute Engine** | AWS Lambda (Node.js 20.x, AWS SDK v3) | Serverless execution of business logic, input sanitization, token crypto |
| **Database** | Amazon DynamoDB (On-Demand) | Key-value and document storage, zero idle provisioned cost, GSI indexing |
| **File Storage** | Amazon S3 (Private Bucket) | Storage for item photographs; upload via short-lived presigned PUT URLs |
| **Identity & Auth** | Amazon Cognito User Pool | Secure authentication for university staff and campus moderators |
| **Monitoring & Logs** | Amazon CloudWatch | Structured logging with strict 14-day retention limits to prevent storage costs |
| **Infrastructure as Code** | AWS SAM & CloudFormation | Reproducible, version-controlled cloud infrastructure definition (`template.yaml`) |

---

## 4. DynamoDB Schema & Access Patterns

### Table 1: `CampusFind-Items`
- **Partition Key**: `itemId` (String, UUID v4)
- **Attributes**: `name`, `nameLower`, `type` (`lost`|`found`), `category`, `description`, `location`, `eventDate`, `imageKey`, `contactName`, `contactMethod`, `status` (`active`|`under_review`|`returned`|`archived`), `moderationStatus` (`approved`|`flagged`|`hidden`), `viewCount`, `createdAt`, `updatedAt`, `clientIpHash`.
- **Global Secondary Indexes**:
  1. `StatusCreatedAtIndex`: Partition Key `status`, Sort Key `createdAt` (Optimized retrieval of active items sorted by newest).
  2. `TypeCreatedAtIndex`: Partition Key `type`, Sort Key `createdAt` (Filters Lost vs Found without full-table scans).

### Table 2: `CampusFind-Ownership`
- **Partition Key**: `itemId` (String, UUID v4)
- **Attributes**: `tokenHash` (SHA-256 hex digest), `salt` (16-byte random hex), `allowedActions` (`["update_status", "edit_details", "delete_report"]`), `failedAttempts` (Counter for brute-force lockouts), `lastFailedAt`, `lastUsedAt`, `createdAt`.

### Table 3: `CampusFind-AbuseReports`
- **Partition Key**: `reportId` (String, UUID v4)
- **Attributes**: `itemId`, `itemName`, `reason` (`spam`|`offensive`|`inaccurate`|`sensitive_info`|`other`), `details`, `reporterIpHash`, `status` (`pending`|`actioned`|`dismissed`), `createdAt`, `resolvedAt`, `resolvedBy`.

---

## 5. REST API Endpoint Reference

| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Healthcheck and API availability status |
| `GET` | `/stats` | Public | Real DynamoDB aggregate counts (lost, found, recovered, active) |
| `GET` | `/items` | Public | Browse items with query filters (`type`, `category`, `status`, `location`, `search`, `limit`, `nextToken`) |
| `GET` | `/items/{itemId}` | Public | Get single public item details; strips private contact details; increments view count |
| `POST` | `/items` | Public | Submit new lost or found report; returns item and one-time 256-bit management token |
| `POST` | `/uploads/presign` | Public | Generate short-lived presigned S3 PUT URL (enforces MIME type and 5MB size limit) |
| `GET` | `/contact/{itemId}` | Public (Privacy Guard) | Safely reveals contact information with campus security meeting guidelines |
| `POST` | `/manage/{itemId}/verify` | Token Owner | Verifies 64-character hex ownership token against salt and hash in DynamoDB |
| `PATCH` | `/items/{itemId}/status` | Token Owner / Admin | Updates report status (e.g. mark as `returned` or `archived`); requires `X-Management-Token` header |
| `DELETE` | `/items/{itemId}` | Token Owner / Admin | Permanently deletes item record, ownership record, and associated S3 photograph |
| `POST` | `/items/{itemId}/report` | Public | Submit abuse/spam report; automatically flags item if abuse threshold exceeded |
| `GET` | `/admin/items` | Admin (Bearer JWT) | Full item catalog including flagged and hidden reports with moderation details |
| `PATCH` | `/admin/items/{itemId}/moderation` | Admin (Bearer JWT) | Moderation actions: set `moderationStatus` to `approved`, `flagged`, or `hidden` |
| `GET` | `/admin/reports` | Admin (Bearer JWT) | Moderator queue of pending abuse reports |
| `PATCH` | `/admin/reports/{reportId}` | Admin (Bearer JWT) | Mark abuse report as `actioned` or `dismissed` |

---

## 6. Security & Privacy Architecture

1. **No Hardcoded Secrets or Exposed Credentials**:
   - The browser client never receives AWS IAM access keys, secret keys, or DynamoDB table credentials.
   - All AWS interactions occur server-side through AWS Lambda execution roles with least-privilege IAM policies.
2. **Cryptographic Token Ownership**:
   - Management tokens are generated using 32 bytes (256 bits) of cryptographic entropy via Node.js `crypto.randomBytes(32)`.
   - Tokens are hashed with a 16-byte salt via SHA-256 before storage.
   - Comparison uses `crypto.timingSafeEqual` to eliminate timing side-channel attacks.
   - Lockout protection: 5 consecutive invalid token attempts triggers an automated 1-hour lockout.
3. **S3 Private Storage & Presigned URLs**:
   - Amazon S3 bucket has `BlockPublicAccess` enabled (all 4 flags set to `true`).
   - Browser uploads directly to S3 using presigned URLs with strict Content-Type headers, unique server-generated keys (`uploads/{timestamp}-{random}.ext`), and 5-minute expirations.
4. **Contact Privacy Isolation**:
   - Raw contact info (`contactMethod`) is stripped from public listing scans and details responses.
   - Contact details are only accessible via `GET /contact/{itemId}`, preventing automated web scrapers from harvesting student contact data.
5. **Input Sanitization**:
   - All user inputs are sanitized against HTML tag injection and cross-site scripting (XSS).

---

## 7. Local Development Guide

### Prerequisites
- Node.js v20.x, v22.x, or v24.x
- npm v10+ or v11+
- Windows PowerShell

### Step-by-Step Setup
1. **Clone the repository and install dependencies**:
   ```powershell
   git clone <repo-url>
   cd Campuslostandfound
   npm --prefix backend install
   npm --prefix frontend install
   ```

2. **Run Automated Tests**:
   ```powershell
   # Run both backend and frontend test suites
   npm test

   # Run backend tests individually
   npm run test:backend

   # Run frontend tests individually
   npm run test:frontend
   ```

3. **Start Local Development Environment**:
   ```powershell
   # Terminal 1: Start local Lambda development server (Port 3001)
   npm --prefix backend start

   # Terminal 2: Start frontend Vite dev server (Port 5173)
   npm --prefix frontend run dev
   ```
   Open your browser to `http://localhost:5173`.

---

## 8. AWS Cloud Deployment Guide

### Prerequisites
- AWS Account with student promotional credits (~$200).
- AWS CLI v2 and AWS SAM CLI (installed and verified).

### Step 1: Configure AWS CLI Credentials
Ensure your AWS credentials are configured in your shell:
```powershell
aws configure
# Enter AWS Access Key ID, Secret Access Key, and Default region (us-east-1)
```
Verify authentication safely without exposing secrets:
```powershell
aws sts get-caller-identity
```

### Step 2: Validate SAM Infrastructure Template
```powershell
sam validate --region us-east-1
```

### Step 3: Automated Deployment Script
Run the automated deployment helper:
```powershell
.\deploy.ps1 -Region us-east-1 -Environment prod
```
The script will:
1. Verify AWS credentials and permissions.
2. Validate `template.yaml`.
3. Run `sam build`.
4. Deploy the CloudFormation stack with interactive changeset confirmation (`--confirm-changeset`).
5. Extract the deployed HTTP API Gateway URL, S3 Bucket Name, and Cognito Pool ID.
6. Populate `frontend/.env.production`.
7. Compile the production frontend bundle into `frontend/dist/`.

### Step 4: Host Frontend on AWS Amplify or S3 + CloudFront
To host the frontend on AWS Amplify Hosting:
```powershell
# In AWS Amplify Console:
# 1. Connect your repository or drag & drop frontend/dist/
# 2. Add SPA redirect rule: Source: </^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/> Target: /index.html Status: 200 (Rewrite)
```

---

## 9. Cost Safeguards & Student Credit Assessment

| AWS Service | Provisioned Tier | Monthly Estimate | Safeguard Measure |
|---|---|---|---|
| **AWS Lambda** | 256MB ARM/x86, 15s timeout | Free Tier / < $0.05 | Scales to zero; sub-100ms execution times |
| **API Gateway** | HTTP API v2 | < $0.05 | HTTP API chosen (70% cheaper than REST API) |
| **Amazon DynamoDB** | On-Demand (PAY_PER_REQUEST) | $0.00 (within 25 RCU/WCU free tier) | Zero recurring hourly provisioned costs |
| **Amazon S3** | Standard Private Bucket | < $0.10 | 5MB image limit; incomplete multipart uploads expire after 1 day |
| **Amazon Cognito** | User Pool | $0.00 | Free up to 50,000 monthly active users |
| **CloudWatch Logs** | 14-day retention | < $0.05 | Explicit retention prevents unbounded log charges |
| **Total Estimated Run Cost** | — | **< $1.00 / month** | **100% safe within $200 student promotional credit** |

---

## 10. License & Credits
Developed for **Metropolitan University** as part of Cloud Computing Architecture.  
Licensed under the **MIT License**.
