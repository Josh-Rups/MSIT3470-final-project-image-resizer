terraform {
  required_version = ">= 1.3.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ============================
# S3 Bucket (ONLY resized)
# ============================
resource "aws_s3_bucket" "resized" {
  bucket        = var.resized_bucket_name
  force_destroy = false
}

# ============================
# IAM Role for Lambda
# ============================
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_tag}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect    = "Allow",
      Principal = { Service = "lambda.amazonaws.com" },
      Action    = "sts:AssumeRole"
    }]
  })
}

# ============================
# Lambda IAM Policy
# ============================
data "aws_iam_policy_document" "lambda_policy" {
  # S3 access to resized bucket only
  statement {
    sid = "S3Access"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:ListBucket"
    ]
    resources = [
      aws_s3_bucket.resized.arn,
      "${aws_s3_bucket.resized.arn}/*"
    ]
  }

  # CloudWatch Logs
  statement {
    sid = "CloudWatchLogs"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["arn:aws:logs:*:*:*"]
  }
}

resource "aws_iam_policy" "lambda_policy" {
  name   = "${var.project_tag}-lambda-policy"
  policy = data.aws_iam_policy_document.lambda_policy.json
}

resource "aws_iam_role_policy_attachment" "lambda_attach" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}

# ============================
# Lambda Function
# ============================
resource "aws_lambda_function" "resizer" {
  function_name = "${var.project_tag}-lambda"
  role          = aws_iam_role.lambda_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.12"
  timeout       = 30

  filename         = "${path.module}/lambda.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda.zip")

  environment {
    variables = {
      OUTPUT_BUCKET = var.resized_bucket_name
    }
  }

  depends_on = [aws_iam_role_policy_attachment.lambda_attach]
}

# ============================
# API Gateway REST API
# ============================
resource "aws_api_gateway_rest_api" "api" {
  name        = "${var.project_tag}-api"
  description = "Image Resizer API"
}

resource "aws_api_gateway_resource" "resize_resource" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "resize"
}

# ---------- POST /resize ----------
resource "aws_api_gateway_method" "post_resize" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.resize_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "post_integration" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.resize_resource.id
  http_method             = aws_api_gateway_method.post_resize.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.resizer.invoke_arn
}

# ---------- OPTIONS /resize ----------
resource "aws_api_gateway_method" "options_resize" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.resize_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Let Lambda handle OPTIONS as well (CORS via your _response helper)
resource "aws_api_gateway_integration" "options_integration" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.resize_resource.id
  http_method             = aws_api_gateway_method.options_resize.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.resizer.invoke_arn
}

# No separate method_response/integration_response needed for proxy

# ============================
# Deployment & Stage
# ============================
resource "aws_api_gateway_deployment" "deployment" {
  rest_api_id = aws_api_gateway_rest_api.api.id

  depends_on = [
    aws_api_gateway_integration.post_integration,
    aws_api_gateway_integration.options_integration
  ]
}

resource "aws_api_gateway_stage" "prod" {
  stage_name    = "prod"
  rest_api_id   = aws_api_gateway_rest_api.api.id
  deployment_id = aws_api_gateway_deployment.deployment.id
}

# ============================
# Lambda permission for API GW
# ============================
resource "aws_lambda_permission" "api_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.resizer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}

# ========================
# Static website bucket for frontend
# ========================
resource "aws_s3_bucket" "website" {
  bucket        = var.website_bucket_name
  force_destroy = false
}

# Ensure bucket owner owns uploaded objects
resource "aws_s3_bucket_ownership_controls" "website_ownership" {
  bucket = aws_s3_bucket.website.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

# Relax public access block so bucket policy can allow public read
resource "aws_s3_bucket_public_access_block" "website_public_access" {
  bucket                  = aws_s3_bucket.website.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Enable static website hosting (index.html at root)
resource "aws_s3_bucket_website_configuration" "website_config" {
  bucket = aws_s3_bucket.website.id

  index_document {
    suffix = "index.html"
  }
}


# ============================
# Outputs
# ============================
output "api_invoke_url" {
  value = aws_api_gateway_stage.prod.invoke_url
}

output "resized_bucket" {
  value = var.resized_bucket_name
}

output "lambda_name" {
  value = aws_lambda_function.resizer.function_name
}
output "website_bucket" {
  description = "Bucket for static website frontend"
  value       = aws_s3_bucket.website.bucket
}

output "website_url" {
  description = "Static website endpoint (S3 website URL)"
  value       = "http://${aws_s3_bucket.website.bucket}.s3-website-${var.aws_region}.amazonaws.com"
}
