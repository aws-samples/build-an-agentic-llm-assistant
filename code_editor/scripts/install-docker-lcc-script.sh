#!/bin/bash
set -eux

# ------------------------------------------------------------------------------
# Install docker
# ------------------------------------------------------------------------------
echo "Installing docker"
# Based on the following link, with refactoring to use sudo https://raw.githubusercontent.com/aws-samples/amazon-sagemaker-local-mode/main/sagemaker_studio_docker_cli_install/sagemaker-ubuntu-jammy-docker-cli-install.sh --no-check-certificate

# This script is meant for Ubuntu 22.04 (Jammy Jellyfish)
# If you want to use another version, set the VERSION_CODENAME environment
# variable when running for another version. It also defaults the DOCKER_HOST
# to the location of the socaket, but if SageMaker evolves, you can set that
# environment variable.
# https://github.com/aws-samples/amazon-sagemaker-local-mode/blob/main/sagemaker_studio_docker_cli_install/sagemaker-ubuntu-jammy-docker-cli-install.sh

sudo -E apt-get update
sudo -E apt-get install -y ca-certificates curl gnupg

# Create the directory and set permissions
sudo mkdir -p /etc/apt/keyrings
sudo chmod -R 0755 /etc/apt/keyrings

# Download and add the Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set permissions for the Docker GPG key
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the Docker repository to APT sources
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME:-jammy}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo -E apt-get update

# Install Docker CE CLI and Docker Compose plugin
VERSION_STRING="5:20.10.24~3-0~ubuntu-${VERSION_CODENAME:-jammy}"
sudo -E apt-get install -y "docker-ce-cli=$VERSION_STRING" docker-compose-plugin

# Validate the Docker Client is able to access Docker Server at [unix:///docker/proxy.sock]
if [ -z "${DOCKER_HOST}" ]; then
  export DOCKER_HOST="unix:///docker/proxy.sock"
fi

docker version