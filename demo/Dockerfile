# Render image for the catm demo. Bakes node_modules + Chrome Headless Shell.
# Bind-mounts the repo root at /work; the demo's node_modules wins via an
# anonymous volume (see render.sh). Resolves `@app/*` against ../src so the
# real React components compile into the demo bundle.
FROM node:22-bookworm-slim

# Chrome dependencies — list lifted from https://www.remotion.dev/docs/docker
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

WORKDIR /work/demo

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

RUN npx remotion browser ensure

CMD ["npx", "remotion", "render", "Demo", "out/demo.mp4"]
