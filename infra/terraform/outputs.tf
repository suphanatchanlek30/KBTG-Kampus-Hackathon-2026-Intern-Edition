output "api_domain" {
  description = "Hostname configured for the API."
  value       = var.api_domain
}

output "elastic_ip" {
  description = "Create an A record for api_domain with this address."
  value       = aws_eip.api.public_ip
}

output "instance_id" {
  description = "EC2 instance ID for AWS Systems Manager sessions and stop/start commands."
  value       = aws_instance.api.id
}

output "ssm_start_session" {
  description = "Command to open an administrator shell without exposing SSH."
  value       = "aws ssm start-session --target ${aws_instance.api.id} --region ${var.aws_region}"
}
