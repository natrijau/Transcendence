#FROM node:20-alpine
FROM node:24

WORKDIR /app

COPY ./package.json ./package-lock.json* ./
RUN npm install

COPY . .

# Expose Vite port
EXPOSE 5173

# Run Vite directly with node instead of npm for proper signal handling
CMD ["node", "vite-wrapper.js"]
