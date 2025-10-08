# Nathkrupa Frontend Deployment Script
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("local", "aws", "both")]
    [string]$Environment = "both"
)

Write-Host "Nathkrupa Frontend Deployment Script" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

function Build-Project {
    Write-Host "Building project..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Build successful!" -ForegroundColor Green
    } else {
        Write-Host "Build failed!" -ForegroundColor Red
        exit 1
    }
}

function Deploy-ToAWS {
    Write-Host "Deploying to AWS S3..." -ForegroundColor Yellow
    aws s3 sync dist/ s3://nathkrupa-bilder-s3 --profile cli-user --delete
    if ($LASTEXITCODE -eq 0) {
        Write-Host "AWS S3 deployment successful!" -ForegroundColor Green
        Write-Host "Frontend available at: https://nathkrupa-bilder-s3.s3.ap-south-1.amazonaws.com/" -ForegroundColor Cyan
    } else {
        Write-Host "AWS S3 deployment failed!" -ForegroundColor Red
    }
}

function Start-LocalDev {
    Write-Host "Starting local development server..." -ForegroundColor Yellow
    Write-Host "Local development will be available at: http://localhost:8080" -ForegroundColor Cyan
    Write-Host "Backend should be running at: http://127.0.0.1:8000" -ForegroundColor Cyan
    npm run dev
}

switch ($Environment) {
    "local" {
        Write-Host "Deploying for LOCAL environment only" -ForegroundColor Blue
        Build-Project
        Start-LocalDev
    }
    "aws" {
        Write-Host "Deploying for AWS environment only" -ForegroundColor Blue
        Build-Project
        Deploy-ToAWS
    }
    "both" {
        Write-Host "Deploying for BOTH environments" -ForegroundColor Blue
        Build-Project
        Deploy-ToAWS
        Write-Host "To start local development, run: npm run dev" -ForegroundColor Cyan
    }
}

Write-Host "Deployment completed!" -ForegroundColor Green
Write-Host "Summary:" -ForegroundColor White
Write-Host "  Local: http://localhost:8080 (run 'npm run dev')" -ForegroundColor White
Write-Host "  AWS S3: https://nathkrupa-bilder-s3.s3.ap-south-1.amazonaws.com/" -ForegroundColor White
Write-Host "  AWS Amplify: https://prod.d2yhmkhmfw6b6v.amplifyapp.com/" -ForegroundColor White
Write-Host "  Backend API: https://nathkrupa-erp-prod.eba-mx9yqpfp.ap-south-1.elasticbeanstalk.com" -ForegroundColor White
