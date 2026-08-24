# Multi-stage lightweight Docker container for NCIIPC Supervisory Analytics Platform
FROM node:20-alpine

WORKDIR /app

# Copy application files
COPY package.json ./
COPY server.js ./
COPY data/ ./data/
COPY engine/ ./engine/
COPY public/ ./public/
COPY test/ ./test/

# Expose server port
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/cses || exit 1

CMD ["node", "server.js"]
