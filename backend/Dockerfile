FROM node:19-alpine AS base

WORKDIR /usr/src/app

# Install dependencies only when needed
FROM base AS deps

RUN apk add --no-cache python3 make g++ bash

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

# Build the TypeScript project
FROM deps AS build

COPY tsconfig.json ./
COPY . .

# Build the demo version (no templates needed)
RUN yarn run rm:public \
  && yarn run tsc --inlineSourceMap false || true \
  && npx tsc-alias

# Production image, copy only necessary files
FROM node:19-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Install only production dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

# Copy built files
COPY --from=build /usr/src/app/public ./public

# Expose the application port
EXPOSE 8000

# Environment variables
ENV APP_PORT=8000
ENV AI_AGENT_URL=http://ai-agent:8001
ENV AI_AGENT_TOKEN=demo-token

# Run the demo gateway
CMD ["node", "public/index.demo.js"]

