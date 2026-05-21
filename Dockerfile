FROM node:20-bookworm-slim

WORKDIR /app

# serialport ships prebuilds for linux; keep toolchain as fallback for rebuilds
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY --chown=node:node . .

ENV NODE_ENV=production

USER node

EXPOSE 4000

CMD ["node", "server.js"]
