# MSIT3470-final-project-image-resizer
Final MSIT370-cloud Computing Course project

# Real-time Image Resizer (AWS Serverless)

## What it does
A minimal real-time serverless image-resizing application where a user uploads a photo and selects a size (small, medium, large).
The frontend sends the image to an API Gateway endpoint. AWS Lambda resizes the image using Pillow, stores it in a private S3 bucket, and returns a presigned URL the user can view.
The frontend UI is hosted as a static website in S3, deployed automatically using a script.


# Tech Stack

## AWS Services
- Amazon S3 (private buckets for resized images; static hosting for frontend)

- AWS Lambda (Python-based image resizer)

- API Gateway (REST API endpoint for the Lambda backend)

- CloudWatch (logs and basic monitoring)

## Apllication and Tooling
- Language: Python 3.12(Pillow for image processing)

- Frontend: Static HTML, CSS, and JavaScript

- Infrastructure: Terraform

- Build & Deployment Scripts: Bash (build_lambda.sh, deploy_frontend.sh)

# Repo structure
- `/app` - frontend /# index.html, styles.css, app.js (static website) +  Lambda backend code(lambda_function.py , requirements.txt)
- `/infra` - Terraform files
- `/scripts` - build_lambda.sh (Builds Lambda ZIP with Pillow + boto3) + deploy_frontend.sh (Deploys frontend to S3 website bucket)
- `/docs` -  architecture diagram
- `/project` - screenshots, final report

# Quick start( Developer Setup)

1. Clone repo and create a feature branch.
2. Edit `infra/variables.tf` to set unique bucket names.
3. Build Lambda ZIP:
  ```bash
   chmod +x scripts/build_lambda.sh
   ./scripts/build_lambda.sh
   
   ```
  
 This script:

	Creates a Lambda-compatible build environment

	Installs Pillow + boto3

	Generates lambda.zip and moves it into /infra
   
 4. Deploy Infrastructure:
   ```  bash
   cd infra
   terraform init
   terraform fmt
   terraform validate
   terraform plan
   terraform apply
   ```
 
 Terraform outputs:

	API Gateway invoke URL

	Lambda name

	Bucket names

 Copy the API URL into the app/frontend/ app.js
	
# Deploy Frontend (Static Website Hosting)

Deploy via the script:
```bash

chmod +x scripts/deploy_frontend.sh
./scripts/deploy_frontend.sh
	```

This script:
	Uploads index.html, styles.css, and app.js to the website bucket
	Clears outdated files
	Confirms deployment success
	Prints the public website URL
The website becomes publicly reachable via the bucket website endpoint.


#Monitoring & SLO Summary

Service Level Objective: 99% of resize requests complete within 2 seconds.

Metrics observed via CloudWatch:

	Lambda Duration

	Lambda Errors

	API Gateway 5XX responses

Design-level alerting recommendations:

Alert if Lambda errors exceed 5% over 5 minutes

Alert if API Gateway 5XX spikes

Track p95 latency for SLO compliance

# AI Assistance Disclosure

ChatGPT was used strictly for:

Debugging support

Documentation drafting

Improving clarity 

All code and functional decisions were validated and finalized by the team.

# Team Responsibilities

## Josh (Backend & Infrastructure)

Lambda function design & implementation

Terraform IaC (buckets, API Gateway, permissions)

Build scripts

Backend testing + debugging

Architecture & monitoring write-up

## Adnan (Frontend & Documentation)

UI/UX design

HTML/CSS/JS implementation

Handling uploads & UI resizing previews

Writing Documentation

Final polishing & presentation

#Final Notes

This project fulfills the MSIT3470 Cloud Computing final project requirements, demonstrating:

A functional serverless application

Proper IAM permissions and least privilege

Infrastructure-as-Code with Terraform

Static site hosting

Cloud-based image processing

Clear architecture and monitoring strategy