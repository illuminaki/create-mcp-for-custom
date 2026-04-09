FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# El MCP server usa stdio, no necesita EXPOSE ports
# Pero lo pondremos en background en docker-compose si es necesario
CMD ["node", "index.js"]
