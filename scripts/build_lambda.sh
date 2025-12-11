#!/usr/bin/env bash
set -e

LAMBDA_DIR="infra"
BUILD_DIR="lambda_build"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy lambda function code
cp app/lambda_function.py "$BUILD_DIR/"

echo "Building Pillow inside Lambda Python 3.12 runtime image..."

docker run --rm \
  -v "$PWD":/var/task \
  -w /var/task \
  --entrypoint /bin/bash \
  public.ecr.aws/lambda/python:3.12 \
  -c "pip install --upgrade pip && pip install Pillow boto3 -t $BUILD_DIR"

echo 'Zipping Lambda package...'
cd "$BUILD_DIR"
zip -r ../lambda.zip .
cd ..

mv lambda.zip "$LAMBDA_DIR/lambda.zip"

echo "Lambda package built successfully: $LAMBDA_DIR/lambda.zip"

