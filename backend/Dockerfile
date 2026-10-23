FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/src ./src
COPY backend/migrations ./migrations

EXPOSE 3001
CMD ["node", "src/dev-server.js"]
