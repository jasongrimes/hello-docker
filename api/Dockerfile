FROM node:20-slim as base
WORKDIR /app

FROM base as prod
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

EXPOSE 4000
CMD ["node", "index.js"]