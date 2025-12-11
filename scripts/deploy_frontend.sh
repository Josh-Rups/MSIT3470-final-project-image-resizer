#!/usr/bin/env bash
set -e

# === CONFIG ===
WEBSITE_BUCKET="msit3470-image-resizer-website-2025"
AWS_REGION="us-east-1"  

echo "Deploying frontend from app/frontend/ to S3 bucket: $WEBSITE_BUCKET"

# Sync the frontend folder to the root of the website bucket
aws s3 sync app/frontend/ "s3://$WEBSITE_BUCKET/" \
  --delete

echo "Frontend deployed."

WEBSITE_URL="http://${WEBSITE_BUCKET}.s3-website-${AWS_REGION}.amazonaws.com"
echo "Open your site at:"
echo "  $WEBSITE_URL"
