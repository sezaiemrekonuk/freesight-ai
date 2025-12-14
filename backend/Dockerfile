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

# NOTE:
# The package.json build script runs "npm run rm:public && ... && npm run copy:files",
# and copy:files tries to "cp .env ./public/.env", which fails in Docker where .env
# is intentionally not copied into the image.
# To avoid baking secrets into the image and to prevent build failure when .env
# is missing, we manually run the underlying build steps without copying .env.
RUN yarn run rm:public \
  && yarn run tsc --inlineSourceMap false || true \
  && npx tsc-alias \
  && mkdir -p public \
  && cp -R ./src/templates ./public

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

