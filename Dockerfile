FROM node:22-alpine

WORKDIR /app

# Install dependencies layer (cached unless package.json changes)
COPY package*.json ./
RUN npm ci --only=production=false

# Copy source & tests
COPY src/ ./src/
COPY tests/ ./tests/

# Run as non-root user for security
USER node

# Run tests with coverage
CMD ["npm", "run", "test:ci"]
