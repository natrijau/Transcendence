FROM node:24

EXPOSE 443

WORKDIR /usr/src/app

COPY ./package*.json ./

RUN npm install
RUN npm install -g nodemon

COPY . .

CMD ["node", "--use-system-ca", "app.js"]
