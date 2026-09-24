#!/bin/bash
# Runs once at first boot: swap (safety net for small instances) + Docker.
set -eux
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu
mkdir -p /opt/travel
chown ubuntu:ubuntu /opt/travel
