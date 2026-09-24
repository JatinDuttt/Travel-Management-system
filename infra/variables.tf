variable "region" {
  type    = string
  default = "ap-south-1" # Mumbai
}

variable "instance_type" {
  type        = string
  default     = "t3.small" # 2 GB RAM. Use t3.micro if your account was created before 15 Jul 2025.
  description = "Check the 'Free tier eligible' label in the EC2 console before applying."
}

variable "public_key_path" {
  type    = string
  default = "~/.ssh/travel-deploy.pub"
}

variable "ssh_cidr" {
  type        = string
  default     = "0.0.0.0/0" # GitHub Actions runners have no fixed IP. Key-only login; tighten later (see README).
  description = "Who may reach port 22"
}
