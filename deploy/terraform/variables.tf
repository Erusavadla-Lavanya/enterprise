variable "aws_region" {
  type        = string
  description = "AWS region for deployment"
  default     = "ap-south-1"
}

variable "db_host" {
  type        = string
  description = "Database Host"
}

variable "db_name" {
  type        = string
  description = "Database Name"
}

variable "db_user" {
  type        = string
  description = "Database Username"
}

variable "db_password" {
  type        = string
  description = "Database Password"
  sensitive   = true
}

variable "db_port" {
  type        = string
  description = "Database Port"
  default     = "3306"
}

variable "cognito_domain" {
  type        = string
  description = "Cognito Domain URL"
}

variable "cognito_region" {
  type        = string
  description = "Cognito User Pool Region"
  default     = "ap-south-1"
}

variable "cognito_user_pool_id" {
  type        = string
  description = "Cognito User Pool ID"
}

variable "cognito_client_id" {
  type        = string
  description = "Cognito App Client ID"
}
