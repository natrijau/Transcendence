FROM node:24

WORKDIR /usr/src/app

COPY ./package.json .

RUN npm install && npm install -g nodemon

RUN apt-get update && apt-get upgrade -y

COPY . .

EXPOSE 3000

CMD ["node", "App.ts"]