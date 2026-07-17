variable "aws_region" {
  type        = string
  description = "AWS region for deployment"
  default     = "ap-south-1"
}

variable "db_host" {
  type        = string
  description = "Database Host"
  default     = "mysql-268d6faf-hrms12.f.aivencloud.com"
}

variable "db_name" {
  type        = string
  description = "Database Name"
  default     = "defaultdb"
}

variable "db_user" {
  type        = string
  description = "Database Username"
  default     = "avnadmin"
}

variable "db_password" {
  type        = string
  description = "Database Password"
  sensitive   = true
  default     = ""
}

variable "db_port" {
  type        = string
  description = "Database Port"
  default     = "14443"
}

variable "cognito_domain" {
  type        = string
  description = "Cognito Domain URL"
  default     = "https://ap-south-1b5vysi7ss.auth.ap-south-1.amazoncognito.com"
}

variable "cognito_region" {
  type        = string
  description = "Cognito User Pool Region"
  default     = "ap-south-1"
}

variable "cognito_user_pool_id" {
  type        = string
  description = "Cognito User Pool ID"
  default     = "ap-south-1_b5vYsi7ss"
}

variable "cognito_client_id" {
  type        = string
  description = "Cognito App Client ID"
  default     = "379s1pachcs1mnnv4rv6m2k2m5"
}
