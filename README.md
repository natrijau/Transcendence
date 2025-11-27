# 42 ft_transcendence

Bienvenue dans le dépôt du projet ft_transcendence, l’un des projets les plus complets et exigeants du cursus 42.
L’objectif : créer un site web moderne, sécurisé, temps réel et déployé en conteneur… dont le cœur est un jeu de Pong jouable en multijoueur.

---

## Table des matières

1. [Introduction](#introduction)
2. [Fichier .env requis](#fichier-env-requis)
3. [Installation et utilisation](#installation-et-utilisation)
4. [Ressources utiles](#ressources-utiles)
5. [Règles communes](#règles-communes)
6. [Mon projet](#mon-projet)

---

## Introduction

ft_transcendence est un projet “surprise” qui marque la fin du tronc commun.
Il combine un grand nombre de compétences différentes : web, réseau, temps réel, sécurité, UX, devops, jeux vidéo et gestion de projet.

L’objectif est de créer un site web complet permettant à des utilisateurs de :

- jouer au Pong en temps réel,

- participer à des tournois,

- s’affronter localement ou en réseau,

- profiter d’une interface moderne et fluide,

- interagir avec un système utilisateur complet,

- utiliser un site sécurisé (HTTPS, protections XSS/SQLi, hashing…),

- lancer l’application intégralement en un seul docker compose up.

Ce projet demande rigueur, organisation, design d’architecture et beaucoup d’adaptabilité : vous serez amenés à utiliser des technologies nouvelles, imposées ou modulaires.

---

## Fichier .env requis

Un fichier `.env` doit obligatoirement être créé à la racine du dossier :


Ce fichier doit contenir :

- l’adresse email utilisée pour envoyer les mails,
- la clé / le mot de passe d’application associé  
  (ex : clé SMTP, mot de passe d’application Gmail, clé Mailjet, etc.)

### Exemple de structure

```env
APP_PASS="votre_cle_d_application"
USR_ADDR="adresse@example.com"
```
Sans ce fichier, l’envoi d’emails 2FA ne fonctionnera pas.

## Installation et utilisation

1. Clonez le dépôt :
   ```bash
   git clone <lien-du-depot>
   cd Transcendence

2. Pour compiler le projet, utilisez le Makefile fourni :
   ```bash
	make

3. Accéder au site :
    Une fois les conteneurs démarrés aller sur : 
	```bash
	https://localhost/5173

## Ressources utiles

- [Documentation officielle TypeScript](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Documentation Docker](https://docs.docker.com/)
- [Fastify (Backend)](https://fastify.dev/)
- [WebSockets (WSS)](https://developer.mozilla.org/fr/docs/Web/API/WebSockets_API)
- [OAuth 2.0](https://oauth.net/2/)

## Règles communes

Comme pour tout projet 42 :
- Pas d’erreurs non gérées côté front ou backend.
- Aucune fuite mémoire dans vos conteneurs.
- Le site doit fonctionner sans crash ni warnings JS.
- Sécurité obligatoire :
    - mots de passe hashés,
    - protections contre XSS/SQL injection,
    - validation des formulaires,
    - HTTPS partout.
- Le .env doit être ignoré par Git.
- Le projet doit fonctionner dans Docker, même en rootless mode.
- Le site doit être entièrement utilisable sur Mozilla Firefox.

