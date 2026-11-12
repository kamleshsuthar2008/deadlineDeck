# Production Dockerfile for DeadlineDeck Platform
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application files
COPY . .

# Set default production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose default HTTP port
EXPOSE 3000

# Run as non-root node user for container security
USER node

# Container health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start server
CMD ["node", "app.js"]

