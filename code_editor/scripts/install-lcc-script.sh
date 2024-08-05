#!/bin/bash

# Get the current AWS region
AWS_REGION=$(aws configure get region)
if [ -z "$AWS_REGION" ]; then
    echo "Error: Unable to determine the current AWS region. Please set the AWS_REGION environment variable."
    exit 1
fi

echo "Using AWS Region: $AWS_REGION"

LCC_CONTENT=`openssl base64 -A -in install-docker-lcc-script.sh`

lifecycle_config_arn=$(aws sagemaker create-studio-lifecycle-config \
--region $AWS_REGION \
--studio-lifecycle-config-name "setup-docker-lcc" \
--studio-lifecycle-config-content $LCC_CONTENT \
--studio-lifecycle-config-app-type CodeEditor)

echo $lifecycle_config_arn
