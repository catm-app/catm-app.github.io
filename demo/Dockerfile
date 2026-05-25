# Render image for the catm demo. Bakes node_modules + Chrome Headless Shell.
# Designed for bind-mount renders: the host project is mounted at /work and
# the container's node_modules wins via an anonymous volume (see render.sh).
FROM node:22-bookworm-slim

# Chrome dependencies — list lifted verbatim from
# https://www.remotion.dev/docs/docker
RUN apt-get update && apt-get install -y \
  libnss3 \
  libdbus-1-3 \
  libatk1.0-0 \
  libgbm-dev \
  libasound2 \
  libxrandr2 \
  libxkbcommon-dev \
  libxfixes3 \
  libxcomposite1 \
  libxdamage1 \
  libatk-bridge2.0-0 \
  libpango-1.0-0 \
  libcairo2 \
  libcups2 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /work

# Install deps based on the lockfile alone so the layer caches well.
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# Download Chrome Headless Shell into the image (matches Remotion's version).
RUN npx remotion browser ensure

# render.sh overrides this with explicit args.
CMD ["npx", "remotion", "render", "Demo", "out/demo.mp4"]
