# infra/variables.tf
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_tag" {
  description = "Tag used to create resource names"
  type        = string
  default     = "msit3470-final-project"
}


variable "resized_bucket_name" {
  description = "S3 bucket name for resized images"
  type        = string
  default     = "msit3470-image-resized-2025"
}
variable "website_bucket_name" {
  description = "S3 bucket name for the static website frontend"
  type        = string
  default     = "msit3470-image-resizer-website-2025"
}
