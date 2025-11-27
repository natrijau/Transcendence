FROM node:24-alpine

WORKDIR /usr/src/app

# Copier UNIQUEMENT package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances (dans le container)
RUN npm install --production

# Copier le reste du code
COPY . .

# Exposer le port
EXPOSE 3000

# Démarrer l'application
CMD ["node", "src/app.js"]