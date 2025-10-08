# 🚀 Nathkrupa Frontend Deployment Guide

This guide explains how to deploy and run the Nathkrupa frontend application in both local and AWS environments.

## 🌍 Environment Configuration

The application automatically detects the environment and uses the appropriate backend API URLs:

- **Local Development**: `http://127.0.0.1:8000`
- **Production (AWS)**: `https://nathkrupa-erp-prod.eba-mx9yqpfp.ap-south-1.elasticbeanstalk.com`

## 🏠 Local Development

### Prerequisites
- Node.js 18+ installed
- Backend Django server running on `http://127.0.0.1:8000`

### Quick Start
```bash
# Install dependencies
npm install

# Start local development server
npm run dev
```

Your app will be available at: **http://localhost:8080**

## ☁️ AWS Deployment

### Option 1: AWS Amplify (Recommended)
The frontend is already deployed on AWS Amplify at:
**https://prod.d2yhmkhmfw6b6v.amplifyapp.com/**

### Option 2: AWS S3
The frontend is also deployed to S3 at:
**https://nathkrupa-django-media.s3.ap-south-1.amazonaws.com/**

## 🔧 Deployment Scripts

### PowerShell Script (Windows)
```powershell
# Deploy to both environments
.\deploy.ps1

# Deploy to AWS only
.\deploy.ps1 -Environment aws

# Deploy to local only
.\deploy.ps1 -Environment local
```

### Manual Commands
```bash
# Build the project
npm run build

# Deploy to AWS S3
aws s3 sync dist/ s3://nathkrupa-django-media --profile cli-user --delete

# Start local development
npm run dev
```

## 📱 Access URLs

| Environment | Frontend URL | Backend API |
|-------------|--------------|-------------|
| **Local** | http://localhost:8080 | http://127.0.0.1:8000 |
| **AWS Amplify** | https://prod.d2yhmkhmfw6b6v.amplifyapp.com/ | https://nathkrupa-erp-prod.eba-mx9yqpfp.ap-south-1.elasticbeanstalk.com |
| **AWS S3** | https://nathkrupa-django-media.s3.ap-south-1.amazonaws.com/ | https://nathkrupa-erp-prod.eba-mx9yqpfp.ap-south-1.elasticbeanstalk.com |

## 🔄 Environment Variables

The application automatically detects the environment, but you can override it with these variables:

```bash
# For local development
VITE_API_ROOT=http://127.0.0.1:8000
VITE_API_BASE=http://127.0.0.1:8000/api/manufacturing

# For production
VITE_API_ROOT=https://nathkrupa-erp-prod.eba-mx9yqpfp.ap-south-1.elasticbeanstalk.com
VITE_API_BASE=https://nathkrupa-erp-prod.eba-mx9yqpfp.ap-south-1.elasticbeanstalk.com/api/manufacturing
```

## 🚨 Troubleshooting

### Blank Page on AWS Amplify
If you see a blank page, check:
1. Backend API is accessible
2. Environment variables are set correctly
3. Console for JavaScript errors

### Local Development Issues
1. Ensure backend Django server is running
2. Check if port 8080 is available
3. Verify API endpoints are responding

### AWS Deployment Issues
1. Ensure AWS CLI is configured with `cli-user` profile
2. Check S3 bucket permissions
3. Verify CloudFront distribution (if using)

## 📋 Status Check

```bash
# Check backend health
curl https://nathkrupa-erp-prod.eba-mx9yqpfp.ap-south-1.elasticbeanstalk.com/api/manufacturing/

# Check S3 deployment
aws s3 ls s3://nathkrupa-django-media/ --profile cli-user
```

## 🎯 Quick Commands

```bash
# Full deployment (local + AWS)
.\deploy.ps1

# Just build
npm run build

# Just run locally
npm run dev

# Just deploy to AWS
.\deploy.ps1 -Environment aws
```

---

**Happy Coding! 🎉**
