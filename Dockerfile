# ==============================================================================
# MIM — Systems Engineering Environment & Verification Container
# ==============================================================================
# Provides a clean, reproducible headless execution environment for:
# - Unified Systems Test Suites (12 NBT + 125 SAGE + RAG + Aduana Verification)
# - Interactive Technical Tour (npm run demo)
# - Next.js Turbopack Production Compilation
# ==============================================================================

FROM node:20-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./
COPY tsconfig.json tsconfig.scripts.json ./

# Install npm dependencies
RUN npm ci || npm install

# Copy application source code
COPY . .

# Set container environment variables
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Default command: Execute unified test suites and verify integrity
CMD ["npm", "test"]
