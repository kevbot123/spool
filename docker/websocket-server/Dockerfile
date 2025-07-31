# WebSocket Server Dockerfile for Spool CMS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Install TypeScript and build
RUN npm install -g typescript
RUN tsc

# Expose WebSocket port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Run the WebSocket server
CMD ["node", "dist/scripts/websocket-server.js"]