FROM node:20-alpine

# Chromium y dependencias para whatsapp-web.js / puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    udev

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY bot-local.js ./

CMD ["node", "bot-local.js"]
