# Multi-Stage Dockerfile for Workshop Builder with Enhanced Security
# Built with OpenAI API integration and professional Docker practices

# =============================================================================
# BUILD STAGE - Dependencies and Build Artifacts
# =============================================================================
FROM python:3.12-slim AS builder

# Set working directory for build stage
WORKDIR /build

# Install system dependencies for building Python packages
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies first (better layer caching)
COPY ./requirements.txt /build/requirements.txt
RUN pip install --no-cache-dir --user -r requirements.txt

# Verify installations
RUN python --version && pip list | grep openai

# =============================================================================
# PRODUCTION STAGE - Optimized Runtime Image
# =============================================================================
FROM python:3.12-slim AS production

# Create non-root user for enhanced security
RUN adduser --disabled-password --gecos '' --uid 1000 workshop-user && \
    mkdir -p /app/workshop-builder && \
    chown -R workshop-user:workshop-user /app

# Set working directory
WORKDIR /app/workshop-builder

# Copy Python packages from builder stage
COPY --from=builder /root/.local /home/workshop-user/.local

# Update PATH for user-installed packages
ENV PATH="/home/workshop-user/.local/bin:$PATH"

# Copy application code with proper ownership
COPY --chown=workshop-user:workshop-user . /app/workshop-builder/

# Ensure scripts are executable
RUN chmod +x /app/workshop-builder/*.sh 2>/dev/null || true

# Add health check for container monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import sys, os; \
        from orchestrator.config import AppConfig; \
        config = AppConfig() if os.path.exists('.env') else None; \
        sys.exit(0)" || exit 1

# Switch to non-root user for security
USER workshop-user

# Set secure environment defaults
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# Define labels for better image management
LABEL maintainer="Workshop Builder Team"
LABEL description="OpenAI API-powered workshop generation system"
LABEL version="2.0.0"
LABEL security.scan="enabled"

# Define the entrypoint
ENTRYPOINT ["python", "cli.py"]

# Default help command if no arguments provided
CMD ["--help"]