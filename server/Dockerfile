FROM node:20-alpine

# Install netcat untuk health-check wait di entrypoint
RUN apk add --no-cache netcat-openbsd

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Pastikan entrypoint pakai LF (bukan CRLF dari Windows)
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["sh", "docker-entrypoint.sh"]
