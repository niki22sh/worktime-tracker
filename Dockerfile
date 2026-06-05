FROM node:20-alpine

WORKDIR /app

# Install dependencies layer (cached unless package.json changes)
COPY package*.json ./
RUN npm ci --only=production=false

# Copy source & tests
COPY src/ ./src/
COPY tests/ ./tests/

# Run tests with coverage
CMD ["npm", "run", "test:ci"]
