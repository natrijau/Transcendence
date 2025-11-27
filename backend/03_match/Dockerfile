FROM node:24

WORKDIR /usr/src/app
RUN mkdir -p /usr/src/app/data

COPY ./package.json ./package-lock.json* ./

RUN npm install && npm install -g nodemon
RUN apt-get update && apt-get upgrade -y
RUN apt-get install sqlite3 -y


COPY . .

EXPOSE 3000

CMD ["node", "app.js"]