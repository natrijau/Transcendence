FROM node:24

WORKDIR /usr/src/app

COPY ./package.json ./package-lock.json* ./

RUN npm install && npm install -g nodemon


RUN apt-get update && apt-get upgrade -y
RUN apt-get install sqlite3 -y

RUN npm install fastify-cron
RUN npm install @fastify/cookie
RUN npm install bcrypt
RUN npm install speakeasy

COPY . .
RUN mkdir -p ./data/

EXPOSE 3000

CMD ["node", "app.js"]