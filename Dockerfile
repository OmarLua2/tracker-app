# ============================================================
# Dockerfile — Tracker App
# ============================================================
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm install --production

# Copy semua source code
COPY server.js ./
COPY public ./public

# Buat folder untuk data (logs & snapshots)
VOLUME ["/app/data"]

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV ADMIN_USER=admin
ENV ADMIN_PASSWORD=admin123

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/session', r => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "server.js"]