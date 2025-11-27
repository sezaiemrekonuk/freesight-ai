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

RUN yarn build

# Production image, copy only necessary files
FROM node:19-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Install only production dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

# Copy built files and other required assets
COPY --from=build /usr/src/app/public ./public

# Expose the application port (default from .env.example is 8000)
EXPOSE 8000

# The app reads APP_PORT from the environment; default to 8000
ENV APP_PORT=8000

CMD ["node", "public/index.js"]


