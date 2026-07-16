terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
  backend "s3" {}
}

provider "aws" {
  region = var.aws_region
}

# Unique suffix for S3 bucket name
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# --- AWS ECR Repository ---
resource "aws_ecr_repository" "backend" {
  name                 = "hrms-backend-api"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
  force_delete = true
}

# --- Private S3 Bucket for Static Frontend ---
resource "aws_s3_bucket" "frontend_bucket" {
  bucket        = "hrms-frontend-portal-${random_id.bucket_suffix.hex}"
  force_destroy = true
}

# S3 Website Configuration
resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend_bucket.id
  index_document {
    suffix = "index.html"
  }
  error_document {
    key = "index.html"
  }
}

# S3 Public Access Block (Strictly Private, accessed only via CloudFront OAC)
resource "aws_s3_bucket_public_access_block" "frontend_pab" {
  bucket                  = aws_s3_bucket.frontend_bucket.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# --- IAM Role for Lambda Backend ---
resource "aws_iam_role" "lambda_role" {
  name = "hrms-lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# --- AWS Lambda Function (Container Image) ---
# Note: For initial deployment, we use a placeholder image if ECR is empty.
# In CI/CD we first target and apply the ECR repo, build/push the image, and then deploy the full stack.
resource "aws_lambda_function" "backend" {
  function_name = "hrms-backend-api"
  role          = aws_iam_role.lambda_role.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.backend.repository_url}:latest"
  timeout       = 30
  memory_size   = 512

  environment {
    variables = {
      DB_HOST              = var.db_host
      DB_NAME              = var.db_name
      DB_USER              = var.db_user
      DB_PASSWORD          = var.db_password
      DB_PORT              = var.db_port
      COGNITO_CLIENT_ID    = var.cognito_client_id
      COGNITO_DOMAIN       = var.cognito_domain
      COGNITO_USER_POOL_ID = var.cognito_user_pool_id
      COGNITO_REGION       = var.cognito_region
      PORT                 = "4000"
      NODE_ENV             = "production"
    }
  }

  lifecycle {
    ignore_changes = [
      image_uri # Prevent terraform from reverting code updates pushed directly by github actions
    ]
  }
}

# --- API Gateway HTTP API ---
resource "aws_apigatewayv2_api" "http_api" {
  name          = "hrms-backend-http-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.backend.invoke_arn
  payload_format_version = "2.0"
}

# Routing all requests to the Lambda function
resource "aws_apigatewayv2_route" "default_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}

# Allow API Gateway to invoke Lambda
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

# --- CloudFront Distribution ---

# OAC (Origin Access Control) for private S3 connection
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "hrms-s3-oac"
  description                       = "CloudFront OAC for HRMS Private S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

locals {
  s3_origin_id   = "S3-Frontend"
  apigw_origin_id = "APIGW-Backend"
}

# Retrieve API Gateway domain from invocation URL
data "aws_arn" "apigw_arn" {
  arn = aws_apigatewayv2_api.http_api.arn
}

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  # Origin 1: S3 Bucket
  origin {
    domain_name              = aws_s3_bucket.frontend_bucket.bucket_regional_domain_name
    origin_id                = local.s3_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  # Origin 2: API Gateway Backend
  origin {
    domain_name = replace(aws_apigatewayv2_stage.default.invoke_url, "/^https?://([^/]+).*/", "$1")
    origin_id   = local.apigw_origin_id
    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = "https-only"
      origin_ssl_protocols     = ["TLSv1.2"]
    }
  }

  # Default Cache Behavior (Directs to S3 Frontend)
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.s3_origin_id

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  # Cache Behavior for API endpoints (/api/* mapped to API Gateway backend)
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.apigw_origin_id

    # Disable caching for APIs
    default_ttl = 0
    min_ttl     = 0
    max_ttl     = 0

    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
      headers = ["Authorization", "Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
    }

    viewer_protocol_policy = "redirect-to-https"
  }

  # SPA Routing Fallback (redirects missing routes like /unauthorized back to index.html for react-router)
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# --- S3 Bucket Policy (Allow CF OAC Access) ---
resource "aws_s3_bucket_policy" "frontend_policy" {
  bucket = aws_s3_bucket.frontend_bucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipalReadOnly"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend_bucket.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.cdn.arn
          }
        }
      }
    ]
  })
}
