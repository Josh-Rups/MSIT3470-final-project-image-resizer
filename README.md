# MSIT3470-final-project-image-resizer
Final MSIT370-cloud Computing Course project

# Image Resizer (AWS Serverless) — Josh & Adnan

## What it does
A minimal serverless app where a user uploads a photo and selects a single size (small/medium/large).
 The app resizes only the chosen size using AWS Lambda, stores the resized image in S3, and
 returns a URL to view/download.

## Tech
- AWS: S3, Lambda, API Gateway, CloudWatch
- IaC: Terraform
- Frontend: Static HTML
- Language: Python (Pillow)

## Repo structure
- `/app` - frontend + lambda source
- `/infra` - Terraform files
- `/scripts` - helper scripts (build lambda)
- `/docs` - diagrams, SLOs
- `/project` - screenshots, final report

## Quick start
1. Clone repo and create a feature branch.
2. Edit `infra/variables.tf` to set unique bucket names.
3. Build Lambda ZIP:
   ```bash
   ./scripts/build_lambda.sh

