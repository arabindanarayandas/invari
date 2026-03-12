#!/bin/bash
set -e

# Configuration
IMAGE_NAME="dhritiman/invari"
VERSION="${1:-latest}"
# Building for the two most common platforms to avoid memory issues
PLATFORMS="linux/amd64,linux/arm64"

echo "🔨 Building Invari multi-architecture image"
echo "📦 Image: $IMAGE_NAME:$VERSION"
echo "🏗️  Platforms: $PLATFORMS"
echo ""

# Ensure buildx builder exists
if ! docker buildx inspect multiarch-builder >/dev/null 2>&1; then
  echo "Creating buildx builder..."
  docker buildx create --name multiarch-builder --driver docker-container --use
fi

# Use the builder
docker buildx use multiarch-builder

# Build and push
docker buildx build \
  --platform "$PLATFORMS" \
  -t "$IMAGE_NAME:$VERSION" \
  -t "$IMAGE_NAME:latest" \
  --label "org.opencontainers.image.title=Invari" \
  --label "org.opencontainers.image.description=API Validation and Security Platform for AI Agents" \
  --label "org.opencontainers.image.version=$VERSION" \
  --label "org.opencontainers.image.created=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  --cache-from type=registry,ref="$IMAGE_NAME:buildcache" \
  --cache-to type=registry,ref="$IMAGE_NAME:buildcache",mode=max \
  --push \
  .

echo "✅ Build complete!"
echo "🔍 Verify with: docker buildx imagetools inspect $IMAGE_NAME:$VERSION"
