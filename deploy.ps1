# ==============================================================================
# CampusFind - Automated AWS Deployment Script (PowerShell / Windows)
# ==============================================================================
# Usage:
#   .\deploy.ps1 [-Region <aws-region>] [-Environment <dev|test|prod>] [-DryRun]
# ==============================================================================

param(
    [string]$Region = "us-east-1",
    [string]$Environment = "prod",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  CampusFind AWS Serverless Deployment Assistant" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. Ensure PATH has AWS and SAM
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 2. Check AWS CLI Authentication
Write-Host "`n[1/7] Inspecting AWS Caller Identity..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
    Write-Host "  Authenticated Account: $($identity.Account)" -ForegroundColor Green
    Write-Host "  IAM Principal ARN:     $($identity.Arn)" -ForegroundColor Green
    Write-Host "  Target Region:         $Region" -ForegroundColor Green
} catch {
    Write-Host "`n[ERROR] AWS credentials not found or expired!" -ForegroundColor Red
    Write-Host "Please configure your AWS student credentials using:" -ForegroundColor Yellow
    Write-Host "  aws configure" -ForegroundColor White
    Write-Host "Or set standard AWS environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN" -ForegroundColor White
    exit 1
}

# 3. Validate SAM Template
Write-Host "`n[2/7] Validating SAM CloudFormation Template..." -ForegroundColor Yellow
sam validate --region $Region
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] SAM template validation failed." -ForegroundColor Red
    exit 1
}
Write-Host "  SAM template is valid." -ForegroundColor Green

# 4. Build SAM Application
Write-Host "`n[3/7] Building Serverless Artifacts with AWS SAM..." -ForegroundColor Yellow
sam build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] SAM build failed." -ForegroundColor Red
    exit 1
}
Write-Host "  SAM build succeeded." -ForegroundColor Green

if ($DryRun) {
    Write-Host "`n[DRY RUN] Exiting before deployment changes." -ForegroundColor Cyan
    exit 0
}

# 5. Deploy SAM Stack (with confirmation prompt)
Write-Host "`n[4/7] Deploying Backend Infrastructure to AWS..." -ForegroundColor Yellow
sam deploy `
    --stack-name "CampusFind-Backend-$Environment" `
    --region $Region `
    --capabilities CAPABILITY_IAM `
    --parameter-overrides Environment="$Environment" AppName="campusfind" `
    --confirm-changeset

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] SAM deployment did not complete." -ForegroundColor Red
    exit 1
}

# 6. Retrieve Stack Outputs
Write-Host "`n[5/7] Retrieving Deployed Stack Outputs..." -ForegroundColor Yellow
$outputs = aws cloudformation describe-stacks `
    --stack-name "CampusFind-Backend-$Environment" `
    --region $Region `
    --query "Stacks[0].Outputs" `
    --output json | ConvertFrom-Json

$apiUrl = ($outputs | Where-Object { $_.OutputKey -eq "HttpApiUrl" }).OutputValue
$bucketName = ($outputs | Where-Object { $_.OutputKey -eq "ImagesBucketName" }).OutputValue
$cognitoPoolId = ($outputs | Where-Object { $_.OutputKey -eq "CognitoUserPoolId" }).OutputValue
$cognitoClientId = ($outputs | Where-Object { $_.OutputKey -eq "CognitoClientId" }).OutputValue

Write-Host "  API Gateway Endpoint: $apiUrl" -ForegroundColor Green
Write-Host "  S3 Private Bucket:    $bucketName" -ForegroundColor Green
Write-Host "  Cognito User Pool:    $cognitoPoolId" -ForegroundColor Green

# 7. Configure Frontend & Build
Write-Host "`n[6/7] Generating Frontend Production Environment..." -ForegroundColor Yellow
$envContent = @"
VITE_AWS_REGION=$Region
VITE_API_BASE_URL=$apiUrl
VITE_S3_BUCKET_NAME=$bucketName
VITE_COGNITO_USER_POOL_ID=$cognitoPoolId
VITE_COGNITO_CLIENT_ID=$cognitoClientId
VITE_CAMPUS_NAME=Metropolitan University
VITE_APP_NAME=CampusFind
VITE_APP_TAGLINE=Lost something? Let's find it.
"@

Set-Content -Path "frontend\.env.production" -Value $envContent
Write-Host "  frontend\.env.production generated." -ForegroundColor Green

Write-Host "`n[7/7] Compiling Production Frontend Bundle..." -ForegroundColor Yellow
npm --prefix frontend run build

Write-Host "`n======================================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT & BUILD COMPLETE!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host "Live Backend API URL: $apiUrl" -ForegroundColor Cyan
Write-Host "Frontend Dist Bundle: d:\Campuslostandfound\frontend\dist" -ForegroundColor Cyan
Write-Host "`nTo host the static frontend on AWS Amplify or CloudFront:" -ForegroundColor Yellow
Write-Host "Option A (AWS Amplify Hosting): Connect GitHub repo or run 'npx @aws-amplify/cli add hosting'"
Write-Host "Option B (S3 + CloudFront): Run 'aws s3 sync frontend/dist s3://<your-web-bucket>'"
