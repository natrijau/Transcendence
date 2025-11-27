FROM node:24

WORKDIR /usr/src/app

RUN mkdir -p /usr/src/app/data/

COPY ./package.json ./package-lock.json* ./

RUN apt-get update && apt-get upgrade -y
RUN apt-get install sqlite3 -y
RUN npm install @fastify/cookie
RUN npm install @fastify/jwt
RUN npm install fastify-cron
RUN npm install @fastify/cors
RUN npm install speakeasy

COPY . .

EXPOSE 3000
CMD ["node", "app.js"]