variable "aws_region" {
  description = "AWS region for the prototype stack."
  type        = string
  default     = "ap-southeast-7"
}

variable "project_name" {
  description = "Short name used for AWS resource tags."
  type        = string
  default     = "ksure-prototype"

  validation {
    condition     = can(regex("^[a-z0-9-]{3,32}$", var.project_name))
    error_message = "project_name must contain 3-32 lowercase letters, numbers, or hyphens."
  }
}

variable "api_domain" {
  description = "Optional public API hostname, for example api.example.com. Leave empty to use an automatic api.<elastic-ip>.nip.io hostname."
  type        = string
  default     = ""

  validation {
    condition     = var.api_domain == "" || (can(regex("^[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]$", var.api_domain)) && !strcontains(var.api_domain, "://"))
    error_message = "api_domain must be empty or a hostname without a scheme or path."
  }
}

variable "frontend_origin" {
  description = "Public Vercel frontend URL used by the API when creating absolute URLs."
  type        = string

  validation {
    condition     = can(regex("^https://[^/]+$", var.frontend_origin))
    error_message = "frontend_origin must be an HTTPS origin with no trailing path."
  }
}

variable "repository_url" {
  description = "Public Git repository cloned by the instance at bootstrap."
  type        = string
  default     = "https://github.com/suphanatchanlek30/KBTG-Kampus-Hackathon-2026-Intern-Edition.git"

  validation {
    condition     = can(regex("^https://github\\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+\\.git$", var.repository_url))
    error_message = "repository_url must be a public HTTPS GitHub repository URL ending in .git."
  }
}

variable "repository_ssh_url" {
  description = "SSH Git URL used when repository_ssh_private_key is set."
  type        = string
  default     = "git@github.com:suphanatchanlek30/KBTG-Kampus-Hackathon-2026-Intern-Edition.git"

  validation {
    condition     = can(regex("^git@github\\.com:[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+\\.git$", var.repository_ssh_url))
    error_message = "repository_ssh_url must be an SSH GitHub repository URL."
  }
}

variable "repository_ssh_private_key" {
  description = "Optional read-only GitHub deploy key for a private repository. Keep it in an untracked terraform.tfvars file."
  type        = string
  default     = null
  sensitive   = true
}

variable "git_ref" {
  description = "Git branch or tag deployed during the initial bootstrap."
  type        = string
  default     = "develop"

  validation {
    condition     = can(regex("^[A-Za-z0-9._/-]+$", var.git_ref))
    error_message = "git_ref may contain only letters, numbers, dots, underscores, slashes, and hyphens."
  }
}

variable "instance_type" {
  description = "ARM instance size. t4g.small is the recommended minimum for the API and PostgreSQL."
  type        = string
  default     = "t4g.small"
}

variable "root_volume_size_gib" {
  description = "Size of the encrypted gp3 EBS root volume used for containers and PostgreSQL data."
  type        = number
  default     = 30

  validation {
    condition     = var.root_volume_size_gib >= 20
    error_message = "root_volume_size_gib must be at least 20 GiB."
  }
}

variable "docker_compose_version" {
  description = "Docker Compose plugin version installed from the official Docker GitHub release."
  type        = string
  default     = "v2.40.3"

  validation {
    condition     = can(regex("^v[0-9]+\\.[0-9]+\\.[0-9]+$", var.docker_compose_version))
    error_message = "docker_compose_version must use the vX.Y.Z format."
  }
}
