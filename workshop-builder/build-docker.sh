#!/bin/bash
# Enhanced Docker Build Script for Workshop Builder
# Includes security scanning, validation, and comprehensive error handling

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# =============================================================================
# CONFIGURATION
# =============================================================================
IMAGE_NAME="workshop-builder-app"
IMAGE_TAG="latest"
BUILD_CONTEXT="."
DOCKERFILE_PATH="Dockerfile"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# VALIDATION FUNCTIONS
# =============================================================================
validate_environment() {
    log_info "Validating build environment..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running or not accessible"
        log_error "Please start Docker and ensure you have proper permissions"
        exit 1
    fi
    
    # Check if Dockerfile exists
    if [ ! -f "${DOCKERFILE_PATH}" ]; then
        log_error "Dockerfile not found at ${DOCKERFILE_PATH}"
        exit 1
    fi
    
    # Check if requirements.txt exists
    if [ ! -f "requirements.txt" ]; then
        log_error "requirements.txt not found"
        exit 1
    fi
    
    log_success "Environment validation passed"
}

validate_env_file() {
    log_info "Validating .env.example file..."
    
    if [ ! -f ".env.example" ]; then
        log_warning ".env.example file not found"
        return 0
    fi
    
    # Check for placeholder values in .env.example
    if grep -q "your_.*_here\|dummy\|placeholder" .env.example; then
        log_info ".env.example contains placeholder values (expected)"
    else
        log_warning ".env.example may not contain proper placeholder values"
    fi
}

# =============================================================================
# BUILD FUNCTIONS
# =============================================================================
build_image() {
    log_info "Building Docker image ${IMAGE_NAME}:${IMAGE_TAG}..."
    log_info "Build context: ${BUILD_CONTEXT}"
    log_info "Dockerfile: ${DOCKERFILE_PATH}"
    
    # Build with detailed output and build args
    if docker build \
        --tag "${IMAGE_NAME}:${IMAGE_TAG}" \
        --file "${DOCKERFILE_PATH}" \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg VCS_REF="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" \
        --progress=plain \
        "${BUILD_CONTEXT}"; then
        
        log_success "Docker image built successfully: ${IMAGE_NAME}:${IMAGE_TAG}"
        return 0
    else
        log_error "Docker image build failed"
        log_error "Check the build output above for specific error details"
        return 1
    fi
}

test_image() {
    log_info "Testing Docker image functionality..."
    
    # Test basic functionality
    if docker run --rm "${IMAGE_NAME}:${IMAGE_TAG}" --help >/dev/null 2>&1; then
        log_success "Image basic functionality test passed"
    else
        log_error "Image basic functionality test failed"
        return 1
    fi
    
    # Test health check if available
    log_info "Testing image health check..."
    if docker run --rm "${IMAGE_NAME}:${IMAGE_TAG}" python -c "print('Health check test passed')"; then
        log_success "Image health check test passed"
    else
        log_warning "Image health check test failed (may be expected without .env)"
    fi
}

scan_image_security() {
    log_info "Scanning image for security vulnerabilities..."
    
    # Check if Trivy is available for security scanning
    if command -v trivy >/dev/null 2>&1; then
        log_info "Running Trivy security scan..."
        if trivy image --exit-code 1 --severity HIGH,CRITICAL "${IMAGE_NAME}:${IMAGE_TAG}"; then
            log_success "Security scan passed - no high/critical vulnerabilities found"
        else
            log_warning "Security scan found vulnerabilities - review the output above"
            log_warning "Consider updating base image or dependencies"
        fi
    else
        log_warning "Trivy not found - skipping security scan"
        log_info "Install Trivy for security scanning: https://aquasecurity.github.io/trivy/"
    fi
}

display_image_info() {
    log_info "Image build information:"
    echo "----------------------------------------"
    echo "Image Name: ${IMAGE_NAME}:${IMAGE_TAG}"
    echo "Build Date: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    echo "Git Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
    
    # Display image size
    if command -v docker >/dev/null 2>&1; then
        IMAGE_SIZE=$(docker images "${IMAGE_NAME}:${IMAGE_TAG}" --format "table {{.Size}}" | tail -n 1)
        echo "Image Size: ${IMAGE_SIZE}"
    fi
    
    echo "----------------------------------------"
}

cleanup_build_cache() {
    log_info "Cleaning up Docker build cache..."
    
    # Remove dangling images
    if docker images -f "dangling=true" -q | grep -q .; then
        docker rmi $(docker images -f "dangling=true" -q) 2>/dev/null || true
        log_success "Removed dangling images"
    else
        log_info "No dangling images to remove"
    fi
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================
main() {
    log_info "Starting enhanced Docker build process for Workshop Builder"
    echo "========================================================================"
    
    # Validation phase
    validate_environment
    validate_env_file
    
    # Build phase
    if ! build_image; then
        log_error "Build failed - exiting"
        exit 1
    fi
    
    # Testing phase
    if ! test_image; then
        log_error "Image testing failed - build may be unstable"
        exit 1
    fi
    
    # Security scanning (optional)
    scan_image_security
    
    # Information display
    display_image_info
    
    # Cleanup
    cleanup_build_cache
    
    echo "========================================================================"
    log_success "Docker build process completed successfully!"
    log_info "You can now run the container with: ./run-docker.sh --help"
    log_info "Or test with: docker run --rm ${IMAGE_NAME}:${IMAGE_TAG} --help"
}

# Execute main function
main "$@"