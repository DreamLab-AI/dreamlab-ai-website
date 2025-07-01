#!/bin/bash
# Enhanced Docker Run Script for Workshop Builder
# Includes security validation, resource limits, and comprehensive error handling

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# =============================================================================
# CONFIGURATION
# =============================================================================
IMAGE_NAME="workshop-builder-app"
IMAGE_TAG="latest"

# Resource limits for container security
MEMORY_LIMIT="2g"
CPU_LIMIT="1.0"
TMPFS_SIZE="100m"

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

show_usage() {
    echo "Usage: $0 [OPTIONS] [CLI_ARGUMENTS]"
    echo ""
    echo "Enhanced Docker runner for Workshop Builder with security features"
    echo ""
    echo "Options:"
    echo "  --help                 Show this help message"
    echo "  --no-limits           Disable resource limits"
    echo "  --memory LIMIT        Set memory limit (default: ${MEMORY_LIMIT})"
    echo "  --cpu LIMIT           Set CPU limit (default: ${CPU_LIMIT})"
    echo "  --debug               Enable debug mode with verbose output"
    echo ""
    echo "CLI Arguments (passed to workshop-builder):"
    echo "  --topic TOPIC         Workshop topic to generate"
    echo "  --verbose             Enable verbose logging"
    echo ""
    echo "Examples:"
    echo "  $0 --topic \"Introduction to Docker\" --verbose"
    echo "  $0 --no-limits --topic \"Advanced Python\""
    echo "  $0 --debug --help"
}

# =============================================================================
# VALIDATION FUNCTIONS
# =============================================================================
validate_environment() {
    log_info "Validating runtime environment..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running or not accessible"
        log_error "Please start Docker and ensure you have proper permissions"
        exit 1
    fi
    
    # Check if image exists
    if ! docker image inspect "${IMAGE_NAME}:${IMAGE_TAG}" >/dev/null 2>&1; then
        log_error "Docker image ${IMAGE_NAME}:${IMAGE_TAG} not found"
        log_error "Please build the image first with: ./build-docker.sh"
        exit 1
    fi
    
    log_success "Environment validation passed"
}

validate_paths() {
    log_info "Validating file paths..."
    
    # Path to the root of the 'website' project on the host machine
    # This assumes the script is run from 'website/workshop-builder/'
    HOST_WEBSITE_ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
    
    # Validate website root directory
    if [ ! -d "${HOST_WEBSITE_ROOT_DIR}" ]; then
        log_error "Website root directory not found: ${HOST_WEBSITE_ROOT_DIR}"
        exit 1
    fi
    
    # Validate workshops directory exists or can be created
    WORKSHOPS_DIR="${HOST_WEBSITE_ROOT_DIR}/public/data/workshops"
    if [ ! -d "${WORKSHOPS_DIR}" ]; then
        log_warning "Workshops directory not found: ${WORKSHOPS_DIR}"
        log_info "Creating workshops directory..."
        mkdir -p "${WORKSHOPS_DIR}" || {
            log_error "Failed to create workshops directory"
            exit 1
        }
    fi
    
    log_success "Path validation passed"
    echo "Host website root: ${HOST_WEBSITE_ROOT_DIR}"
}

validate_env_file() {
    log_info "Validating environment configuration..."
    
    # Path to the .env file on the host machine
    HOST_ENV_FILE="${HOST_WEBSITE_ROOT_DIR}/workshop-builder/.env"
    
    if [ ! -f "${HOST_ENV_FILE}" ]; then
        log_error ".env file not found at ${HOST_ENV_FILE}"
        log_error "Please copy .env.example to .env and fill in your API keys:"
        log_error "  cp .env.example .env"
        log_error "  # Edit .env with your actual API keys"
        exit 1
    fi
    
    # Check for placeholder values that indicate incomplete setup
    if grep -q "your_.*_here\|dummy.*key\|placeholder" "${HOST_ENV_FILE}"; then
        log_error "Environment file contains placeholder values"
        log_error "Please update ${HOST_ENV_FILE} with actual API keys"
        log_error "Required keys: GEMINI_API_KEY, OPENAI_API_KEY, GITHUB_TOKEN"
        exit 1
    fi
    
    # Check for required environment variables
    local required_vars=("GEMINI_API_KEY" "OPENAI_API_KEY" "GITHUB_TOKEN" "GITHUB_REPO_OWNER" "GITHUB_REPO_NAME")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "${HOST_ENV_FILE}"; then
            missing_vars+=("${var}")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Missing required environment variables in ${HOST_ENV_FILE}:"
        for var in "${missing_vars[@]}"; do
            log_error "  - ${var}"
        done
        exit 1
    fi
    
    log_success "Environment file validation passed"
}

# =============================================================================
# DOCKER RUN FUNCTIONS
# =============================================================================
build_docker_command() {
    local docker_args=()
    
    # Basic container options
    docker_args+=(
        "--rm"                                    # Remove container when it exits
        "--interactive"                           # Keep STDIN open
        "--tty"                                   # Allocate a pseudo-TTY
    )
    
    # Security options
    docker_args+=(
        "--security-opt=no-new-privileges"       # Prevent privilege escalation
        "--cap-drop=ALL"                         # Drop all capabilities
        "--cap-add=DAC_OVERRIDE"                 # Allow file access (needed for workshop creation)
        "--read-only"                            # Make root filesystem read-only
        "--tmpfs=/tmp:rw,noexec,nosuid,size=${TMPFS_SIZE}"  # Secure temporary filesystem
    )
    
    # Resource limits (if enabled)
    if [ "${USE_LIMITS}" = "true" ]; then
        docker_args+=(
            "--memory=${MEMORY_LIMIT}"
            "--cpus=${CPU_LIMIT}"
            "--pids-limit=100"                   # Limit number of processes
        )
        log_info "Resource limits enabled: Memory=${MEMORY_LIMIT}, CPU=${CPU_LIMIT}"
    else
        log_warning "Resource limits disabled"
    fi
    
    # Volume mounts
    docker_args+=(
        "--volume=${HOST_WEBSITE_ROOT_DIR}:/app:rw"
        "--workdir=/app/workshop-builder"
    )
    
    # Environment configuration
    docker_args+=(
        "--env-file=${HOST_ENV_FILE}"
        "--env=PYTHONUNBUFFERED=1"
        "--env=PYTHONDONTWRITEBYTECODE=1"
    )
    
    # Debug mode environment
    if [ "${DEBUG_MODE}" = "true" ]; then
        docker_args+=(
            "--env=LOG_LEVEL=DEBUG"
        )
    fi
    
    # Image and command
    docker_args+=("${IMAGE_NAME}:${IMAGE_TAG}")
    
    echo "${docker_args[@]}"
}

run_container() {
    log_info "Starting Workshop Builder container..."
    log_info "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
    log_info "Working directory: /app/workshop-builder"
    log_info "Output directory: /app/public/data/workshops"
    
    if [ "${DEBUG_MODE}" = "true" ]; then
        log_info "Debug mode enabled - verbose Docker output"
    fi
    
    # Build Docker command arguments
    local docker_cmd
    read -ra docker_cmd <<< "$(build_docker_command)"
    
    # Add user arguments to the end
    docker_cmd+=("$@")
    
    # Execute Docker command
    if [ "${DEBUG_MODE}" = "true" ]; then
        log_info "Executing: docker run ${docker_cmd[*]}"
    fi
    
    docker run "${docker_cmd[@]}"
}

# =============================================================================
# ARGUMENT PARSING
# =============================================================================
parse_arguments() {
    USE_LIMITS="true"
    DEBUG_MODE="false"
    CLI_ARGS=()
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help)
                show_usage
                exit 0
                ;;
            --no-limits)
                USE_LIMITS="false"
                shift
                ;;
            --memory)
                MEMORY_LIMIT="$2"
                shift 2
                ;;
            --cpu)
                CPU_LIMIT="$2"
                shift 2
                ;;
            --debug)
                DEBUG_MODE="true"
                shift
                ;;
            *)
                CLI_ARGS+=("$1")
                shift
                ;;
        esac
    done
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================
main() {
    log_info "Starting enhanced Workshop Builder Docker runner"
    echo "========================================================================"
    
    # Parse command line arguments
    parse_arguments "$@"
    
    # Validation phase
    validate_environment
    validate_paths
    validate_env_file
    
    # Run container with parsed arguments
    if ! run_container "${CLI_ARGS[@]}"; then
        log_error "Container execution failed"
        exit 1
    fi
    
    log_success "Workshop Builder execution completed"
}

# Execute main function with all arguments
main "$@"