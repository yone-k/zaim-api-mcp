FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies and source files
RUN rm -rf src/ tsconfig.json vitest.config.ts && \
    npm prune --production

ENTRYPOINT ["node", "dist/index.js"]