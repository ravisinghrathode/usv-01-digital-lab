FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# .dockerignore excludes private credentials and host-local material.
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    STAFF_CREDENTIAL_STORE=/app/.secrets/staff-credentials.json \
    AI_REVIEW_PROVIDER=deterministic \
    USV_ALLOW_PAID_AI_API=false \
    USV_SUBSCRIPTION_PILOT=disabled

COPY --from=build /app /app
# The data and staff-secret paths must be writable even with read_only: true.
# Never bake password hashes, passphrases or signing keys into an image.
RUN mkdir -p /app/data /app/.secrets && \
    chown -R node:node /app/data /app/.secrets && \
    chmod 0700 /app/.secrets

USER node
EXPOSE 3000

CMD ["npm", "start"]
