FROM node:24

RUN mkdir -p /usr/src/app/
WORKDIR /usr/src/app

COPY ./package.json ./package.json
COPY ./shutdown.js ./shutdown.js

RUN npm install
RUN npm i fastify
RUN apt-get update && apt-get upgrade -y