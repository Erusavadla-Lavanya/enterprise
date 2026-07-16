output "ecr_repository_url" {
  value       = aws_ecr_repository.backend.repository_url
  description = "URL of the ECR repository for the backend image"
}

output "cloudfront_domain_name" {
  value       = aws_cloudfront_distribution.cdn.domain_name
  description = "Domain name of the CloudFront CDN distribution"
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.frontend_bucket.id
  description = "Name of the S3 bucket hosting the frontend static website"
}

output "api_gateway_url" {
  value       = aws_apigatewayv2_stage.default.invoke_url
  description = "Invoke URL of the API Gateway endpoint"
}

output "lambda_function_name" {
  value       = aws_lambda_function.backend.function_name
  description = "Name of the backend Lambda function"
}
