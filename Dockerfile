# GitHub Contributions Generator
# Production Docker Image

FROM node:20-alpine

# Install git
RUN apk add --no-cache git

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application source
COPY src/ ./src/

# Create directories for data and logs
RUN mkdir -p /app/logs /app/data && \
    chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Set default environment variables
ENV NODE_ENV=production \
    SCHEDULE_ENABLED=true \
    HEALTH_ENABLED=true \
    HEALTH_PORT=3000 \
    LOG_LEVEL=info

# Expose health check port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run the application
CMD ["node", "src/index.js"]
