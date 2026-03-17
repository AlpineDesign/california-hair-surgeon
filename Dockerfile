# Build React client
FROM node:20-alpine AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
ENV REACT_APP_API_URL=
RUN npm run build

# Production image
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY server/ ./server/
COPY --from=client /app/client/build ./client/build

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "server/index.js"]
