FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    AI_REVIEW_PROVIDER=deterministic \
    USV_ALLOW_PAID_AI_API=false \
    USV_SUBSCRIPTION_PILOT=disabled

COPY --from=build /app /app
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node
EXPOSE 3000

CMD ["npm", "start"]
