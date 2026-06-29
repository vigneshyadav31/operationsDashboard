# ──────────────────────────────────────────────────────────────────────────────
# The Operations Dashboard — production container image
#
# Multi-stage build:
#   1) client-build : install all workspaces, build the Vite client -> client/dist
#   2) runtime       : node:22-slim image with ONLY server prod deps + built client
#
# better-sqlite3 ships a native addon. The slim base image lacks a C/C++ toolchain,
# so each stage that runs `npm` installs build-essential + python3 first, then the
# native module is compiled (or a prebuilt binary is downloaded) at install time.
#
# Final image: NODE_ENV=production, listens on 4000, runs `node server/src/index.js`,
# which serves the API and the built client from client/dist (see server/src/index.js).
# ──────────────────────────────────────────────────────────────────────────────

# ---- Stage 1: build the client bundle -----------------------------------------
FROM node:22-slim AS client-build
WORKDIR /app

# Toolchain for native deps (better-sqlite3) so the workspace install succeeds.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ build-essential ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=development

# Copy workspace manifests first to maximise Docker layer caching.
COPY package.json package-lock.json* ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json

# Install every workspace (root + server + client). If a lockfile exists use the
# reproducible `npm ci`; otherwise fall back to `npm install`.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy the rest of the sources and build the client into client/dist.
COPY . .
RUN npm run build --workspace client


# ---- Stage 2: production runtime ----------------------------------------------
FROM node:22-slim AS runtime
WORKDIR /app

# Toolchain needed to (re)build better-sqlite3 against this image's Node/ABI.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ build-essential ca-certificates dumb-init \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=4000

# Install ONLY the server's production dependencies. We install inside the server
# workspace directly (no client devDeps, no vite) to keep the image lean.
COPY server/package.json ./server/package.json
RUN cd server \
    && (if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi) \
    && npm cache clean --force

# Copy the server source and the pre-built client bundle from the build stage.
COPY server ./server
COPY --from=client-build /app/client/dist ./client/dist

# SQLite data lives here (server/data/ops.sqlite). Declared as a volume so the
# database survives container restarts; docker-compose binds a named volume to it.
RUN mkdir -p /app/server/data
VOLUME ["/app/server/data"]

# Drop privileges: run as the built-in non-root `node` user.
RUN chown -R node:node /app
USER node

EXPOSE 4000

# dumb-init gives us correct PID 1 signal handling (clean SIGTERM shutdown).
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/src/index.js"]
