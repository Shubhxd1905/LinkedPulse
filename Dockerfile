# LinkedPulse Containerized Free-Tier Deployment (Render / Docker)
# Multi-stage build standardizing on Corepack & pnpm to eliminate competing lockfiles

# Stage 1: Build React Production Frontend using Corepack & pnpm
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY frontend/linkedin-post-studio/package.json frontend/linkedin-post-studio/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/linkedin-post-studio/ ./
RUN pnpm run build

# Stage 2: Python Backend & Unified Same-Origin Server
FROM python:3.10-slim AS runner
WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV ENV=production
ENV HOST=0.0.0.0
ENV PORT=8000

# Install system dependencies required for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/linkedin-optimizer/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application
COPY backend/linkedin-optimizer/ ./backend/linkedin-optimizer/

# Copy built frontend assets to STATIC_DIR
COPY --from=frontend-builder /app/frontend/dist ./frontend/linkedin-post-studio/dist

WORKDIR /app/backend/linkedin-optimizer

EXPOSE 8000

CMD ["python", "server.py"]
