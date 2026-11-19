FROM node:22-slim

WORKDIR /app/server

COPY server/package.json server/package-lock.json ./
RUN npm ci --include=dev

COPY server/ ./
COPY miniapp/src/data/ ../miniapp/src/data/
COPY ios/appstore/privacy.html ./public/privacy.html

RUN mkdir -p /var/data
ENV NODE_ENV=production \
    PORT=8787 \
    DATA_FILE=/var/data/data.json \
    FANS_FILE=/var/data/fans.json

EXPOSE 8787
CMD ["npm", "start"]
