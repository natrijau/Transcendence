# 42 ft_transcendence Backend

Dev : Pour modifier un micro-service, utiliser la branche correspondant a ce micro-service. Si elle n'existe pas, la creer. 
Sur cette branche, modifier UNIQUEMENT ce micro-service.


## Architecture des Micro-services

### 1. Proxy Service (Port 3000)
- Reverse proxy HTTPS
- Gestion des routes vers les autres services
- SSL/TLS

### 2. User Service (Port 3001)
- Gestion des utilisateurs
- Authentification (username)
- Status des joueurs

### 3. Match Service (Port 3002)
- Création/gestion des matchs
- Scores et résultats

### 4. Tournament Service (Port 3003)
- Création/gestion des tournois
- Status des tournois
- Brackets/éliminations
- Classements

## Comment lancer le projet

# Installation
```bash
make 
```
# Développement
- voir Makefile pour plus de renseignements

# Tests
- voir Makefile pour plus de renseignements


## API Documentation

### User Service
- POST /user/register - Création d'utilisateur
- voir /routes/
...

### Match Service
- POST /match/matches - Création d'un match
- GET /match/matches - Pour récupérer les matches
- GET /match/matches/:id - Pour récupérer un match par id
- voir /routes/
...

### Tournament Service
- voir /routes/
...

