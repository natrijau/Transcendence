import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import shutdown from '../common_tools/shutdown.js';
import { authenticateFromCookie } from './authentication/auth.js';

const fastify = Fastify({ logger: false });

// Enregistrer CORS
fastify.register(fastifyCors, {
  origin: true,
  credentials: true
});

// Enregistrer le plugin WebSocket
fastify.register(fastifyWebsocket);

fastify.register(shutdown);

// Stockage des salles de jeu
const gameRooms = new Map();

// Helper pour récupérer les infos user complètes depuis user-service
// sessionData vient de authenticateFromCookie() et contient { id, name, type, ... }
async function getUserFromSessionData(sessionData) {
  try {
    const userRes = await fetch(`http://user-service:3000/${sessionData.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: sessionData.type })
    });

    if (!userRes.ok) {
      console.error(`[getUserFromSessionData] HTTP error: ${userRes.status}`);
      return null;
    }

    const userData = await userRes.json();
    return userData.user;
  } catch (error) {
    console.error('[getUserFromSessionData] Error:', error);
    return null;
  }
}

// Helper pour mettre à jour le wallet via la nouvelle route /updatewallet
async function updateUserWallet(userName, userType, newWallet) {
  try {
    const response = await fetch(`http://user-service:3000/updatewallet`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: userName,
        type: userType,
        wallet: newWallet
      })
    });
    if (!response.ok) {
      console.error(`[updateUserWallet] HTTP error: ${response.status}`);
      return false;
    }
    //console.log(`[updateUserWallet] Wallet mis à jour pour ${userName}: ${newWallet}€`);
    return true;
  } catch (error) {
    console.error('[updateUserWallet] Error:', error);
    return false;
  }
}

// Génération d'un deck de cartes
function generateDeck() {
  const patterns = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];
  const names = ['As', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
  const deck = [];
  
  for (let i = 0; i < 6; i++) {
    patterns.forEach(pattern => {
      names.forEach(name => {
        deck.push(`${name}_of_${pattern}`);
      });
    });
  }
  
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  return deck;
}

// Calculer la valeur d'une main
function calculateHandValue(cards) {
  let value = 0;
  let aces = 0;

  //console.log('[calculateHandValue] Cards:', cards);

  cards.forEach(card => {
    const name = card.split('_of_')[0];
    //console.log('[calculateHandValue] Card:', card, 'Name:', name);
    if (name === 'As') {
      aces++;
      value += 11;
      //console.log('[calculateHandValue] As found, value now:', value);
    } else if (['Jack', 'Queen', 'King'].includes(name)) {
      value += 10;
      //console.log('[calculateHandValue] Figure found, value now:', value);
    } else {
      const cardValue = parseInt(name);
      value += cardValue;
      //console.log('[calculateHandValue] Number card:', cardValue, 'value now:', value);
    }
  });

  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
    //console.log('[calculateHandValue] Adjusting ace, value now:', value);
  }

  //console.log('[calculateHandValue] Final value:', value);
  return value;
}

// Broadcast à tous les joueurs d'une room
function broadcastToRoom(room, event, data) {
  room.players.forEach(player => {
    if (player.socket.readyState === 1) { // WebSocket.OPEN
      player.socket.send(JSON.stringify({ event, data }));
    }
  });
}

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'blackjack' };
});

// Route WebSocket
fastify.register(async function (fastify) {
  fastify.get('/blackjack', { websocket: true }, async (socket, req) => {
    let playerId = null;
    let roomId = null;
    let authenticatedUser = null; // Stocker les infos user depuis la DB
    let sessionData = null; // Données de session (id, name, type, etc.)

    //console.log('[WebSocket] Nouvelle connexion');

    // Authentifier via le cookie
    sessionData = await authenticateFromCookie(req.headers.cookie || '');
    if (sessionData) {
      //console.log('[WebSocket] Utilisateur authentifié:', sessionData.name);
    } else {
      //console.log('[WebSocket] Aucun utilisateur authentifié');
    }

    socket.on('message', async (message) => {
      try {
        const { event, data } = JSON.parse(message.toString());

        switch (event) {
          case 'join':
            handleJoin(socket, data);
            break;
          case 'placeBet':
            handlePlaceBet(data);
            break;
          case 'startGame':
            handleStartGame();
            break;
          case 'hit':
            handleHit();
            break;
          case 'stand':
            handleStand();
            break;
          case 'double':
            handleDouble();
            break;
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    async function handleJoin(socket, data) {
      playerId = Math.random().toString(36).substring(7);

      // OBLIGATOIRE: Être authentifié pour jouer
      if (!sessionData) {
        //console.log(`[handleJoin] REJECTED: Pas d'authentification`);
        socket.send(JSON.stringify({
          event: 'error',
          data: 'Authentification requise pour jouer'
        }));
        return;
      }

      // Récupérer les infos complètes user depuis la DB
      const dbUser = await getUserFromSessionData(sessionData);
      if (!dbUser) {
        //console.log(`[handleJoin] REJECTED: Impossible de récupérer user depuis DB`);
        socket.send(JSON.stringify({
          event: 'error',
          data: 'Utilisateur non trouvé en base de données'
        }));
        return;
      }

      // Stocker les infos user
      authenticatedUser = dbUser;
      const userDbId = dbUser.id;
      const userType = dbUser.type; // "registered" ou "guest"
      const userName = dbUser.name || sessionData.name || data.username || 'Player';
      const initialBalance = dbUser.wallet !== undefined ? dbUser.wallet : 500;

      //console.log(`[handleJoin] User ${userName} (${userType}) rejoint avec balance: ${initialBalance}€`);

      if (data.mode === 'solo') {
        roomId = `solo_${playerId}`;
        const room = {
          id: roomId,
          mode: 'solo',
          players: new Map(),
          state: 'waiting',
          dealerHand: [],
          currentPlayerIndex: 0,
          currentHandPosition: null, // Position de la main en cours
          deck: generateDeck()
        };
        gameRooms.set(roomId, room);
      } else {
        let foundRoom = false;
        for (const [id, room] of gameRooms.entries()) {
          if (room.mode === 'multi' && room.state === 'waiting' && room.players.size < 2) {
            roomId = id;
            foundRoom = true;
            break;
          }
        }

        if (!foundRoom) {
          roomId = `multi_${Date.now()}`;
          const room = {
            id: roomId,
            mode: 'multi',
            players: new Map(),
            state: 'waiting',
            dealerHand: [],
            currentPlayerIndex: 0,
            currentHandPosition: null, // Position de la main en cours
            deck: generateDeck()
          };
          gameRooms.set(roomId, room);
        }
      }

      const room = gameRooms.get(roomId);
      const player = {
        id: playerId,
        username: userName,
        balance: initialBalance,
        socket: socket,
        bets: new Map(),
        hands: new Map(),
        ready: false,
        //stocker les infos pour update DB
        dbId: userDbId,
        dbType: userType,
        dbName: userName,
        authenticated: !!authenticatedUser
      };

      room.players.set(playerId, player);

      socket.send(JSON.stringify({
        event: 'joined',
        data: {
          playerId,
          roomId,
          mode: room.mode,
          playerCount: room.players.size,
          balance: initialBalance, //Envoyer la balance au frontend
          username: player.username
        }
      }));

      broadcastToRoom(room, 'playerJoined', {
        username: player.username,
        playerCount: room.players.size
      });

      if (room.mode === 'solo' || room.players.size === 2) {
        room.state = 'betting';
        broadcastToRoom(room, 'bettingPhase', {
          message: 'Placez vos paris (positions 1-5)'
        });
      }
    }

    function handlePlaceBet(data) {
      if (!playerId || !roomId) return;
      const room = gameRooms.get(roomId);
      if (!room || room.state !== 'betting') return;

      const player = room.players.get(playerId);
      if (!player) return;

      if (data.position < 1 || data.position > 5) {
        socket.send(JSON.stringify({ event: 'error', data: 'Position invalide (1-5)' }));
        return;
      }

      //console.log(`[handlePlaceBet] Player ${playerId} trying to bet ${data.amount} on position ${data.position}, current balance: ${player.balance}`);

      if (data.amount > player.balance) {
        //console.log(`[handlePlaceBet] REJECTED: ${data.amount} > ${player.balance}`);
        socket.send(JSON.stringify({ event: 'error', data: 'Solde insuffisant' }));
        return;
      }

      let positionTaken = false;
      room.players.forEach(p => {
        if (p.bets.has(data.position)) {
          positionTaken = true;
        }
      });

      if (positionTaken) {
        socket.send(JSON.stringify({ event: 'error', data: 'Position déjà prise' }));
        return;
      }

      player.bets.set(data.position, data.amount);
      player.balance -= data.amount;

      broadcastToRoom(room, 'betPlaced', {
        playerId,
        username: player.username,
        position: data.position,
        amount: data.amount,
        balance: player.balance
      });

      let allPlayersHaveBets = true;
      room.players.forEach(p => {
        if (p.bets.size === 0) allPlayersHaveBets = false;
      });

      if (allPlayersHaveBets) {
        broadcastToRoom(room, 'readyToStart', { message: 'Cliquez sur START pour commencer' });
      }
    }

    function handleStartGame() {
      if (!playerId || !roomId) return;
      const room = gameRooms.get(roomId);
      if (!room || room.state !== 'betting') return;

      const player = room.players.get(playerId);
      if (!player) return;

      player.ready = true;

      let allReady = true;
      room.players.forEach(p => {
        if (!p.ready) allReady = false;
      });

      if (!allReady && room.mode === 'multi') {
        broadcastToRoom(room, 'waitingForPlayers', { 
          message: 'En attente des autres joueurs...' 
        });
        return;
      }

      startRound(room);
    }

    function startRound(room) {
      room.state = 'playing';
      room.dealerHand = [];

      // Régénérer le deck si nécessaire
      if (room.deck.length < 52) {
        room.deck = generateDeck();
      }

      room.players.forEach(player => {
        player.hands.clear();
        player.bets.forEach((amount, position) => {
          const hand = [];
          hand.push(room.deck.pop());
          hand.push(room.deck.pop());
          player.hands.set(position, hand);
          //console.log(`[startRound] Player ${player.id} position ${position} initial hand:`, hand);
        });
      });

      room.dealerHand.push(room.deck.pop());
      room.dealerHand.push(room.deck.pop());
      //console.log('[startRound] Dealer initial hand:', room.dealerHand);

      const gameState = {
        dealerCard: room.dealerHand[0],
        dealerCards: room.dealerHand, // Envoyer les 2 cartes du dealer
        players: Array.from(room.players.values()).map(p => ({
          id: p.id,
          username: p.username,
          balance: p.balance,
          hands: Object.fromEntries(
            Array.from(p.hands.entries()).map(([pos, cards]) => [
              pos,
              { cards, value: calculateHandValue(cards) }
            ])
          )
        }))
      };

      broadcastToRoom(room, 'roundStarted', gameState);
      nextPlayerTurn(room);
    }

    function nextPlayerTurn(room) {
      const playerIds = Array.from(room.players.keys());

      // Si on a fini avec tous les joueurs passer au dealer
      if (room.currentPlayerIndex >= playerIds.length) {
        //console.log('[nextPlayerTurn] All players done, starting dealer turn');
        dealerTurn(room);
        return;
      }

      const currentPlayerId = playerIds[room.currentPlayerIndex];
      const currentPlayer = room.players.get(currentPlayerId);

      // Trouver la prochaine main à jouer pour ce joueur
      const positions = Array.from(currentPlayer.hands.keys()).sort((a, b) => a - b);
      //console.log('[nextPlayerTurn] Player positions:', positions, 'currentHandPosition:', room.currentHandPosition);

      // Si currentHandPosition est null, commencer par la première main
      if (room.currentHandPosition === null) {
        if (positions.length === 0) {
          //console.log('[nextPlayerTurn] No hands for this player, moving to next player');
          room.currentPlayerIndex++;
          nextPlayerTurn(room);
          return;
        }
        room.currentHandPosition = positions[0];
        //console.log('[nextPlayerTurn] Starting with first position:', room.currentHandPosition);
      } else {
        //console.log('[nextPlayerTurn] Using current position:', room.currentHandPosition);
      }

      // Vérifier si cette main peut encore jouer
      const currentHand = currentPlayer.hands.get(room.currentHandPosition);
      const handValue = calculateHandValue(currentHand);
      //console.log('[nextPlayerTurn] Hand value for position', room.currentHandPosition, ':', handValue);

      if (handValue === 21 && currentHand.length === 2) {
        // Blackjack notifier le joueur
        //console.log('[nextPlayerTurn] Blackjack! Skipping to next hand');
        broadcastToRoom(room, 'blackjack', {
          playerId: currentPlayerId,
          position: room.currentHandPosition
        });

        const currentIndex = positions.indexOf(room.currentHandPosition);
        if (currentIndex + 1 < positions.length) {
          room.currentHandPosition = positions[currentIndex + 1];
          nextPlayerTurn(room);
        } else {
          room.currentPlayerIndex++;
          room.currentHandPosition = null;
          nextPlayerTurn(room);
        }
        return;
      } else if (handValue > 21) {
        // Bust! Cette main est terminée
        //console.log('[nextPlayerTurn] Bust! Skipping to next hand');
        const currentIndex = positions.indexOf(room.currentHandPosition);
        if (currentIndex + 1 < positions.length) {
          room.currentHandPosition = positions[currentIndex + 1];
          nextPlayerTurn(room);
        } else {
          room.currentPlayerIndex++;
          room.currentHandPosition = null;
          nextPlayerTurn(room);
        }
        return;
      }

      //console.log('[nextPlayerTurn] Broadcasting playerTurn for position', room.currentHandPosition);
      broadcastToRoom(room, 'playerTurn', {
        playerId: currentPlayerId,
        username: currentPlayer.username,
        position: room.currentHandPosition
      });
    }

    function handleHit() {
      if (!playerId || !roomId) return;
      const room = gameRooms.get(roomId);
      if (!room || room.state !== 'playing') return;

      const player = room.players.get(playerId);
      if (!player) return;

      // Vérifier que c'est bien le tour de ce joueur
      const playerIds = Array.from(room.players.keys());
      const currentPlayerId = playerIds[room.currentPlayerIndex];
      if (currentPlayerId !== playerId) {
        socket.send(JSON.stringify({ event: 'error', data: 'Ce n\'est pas votre tour' }));
        return;
      }

      // Utiliser la main courante
      const targetPosition = room.currentHandPosition;
      if (targetPosition === null) return;

      const targetHand = player.hands.get(targetPosition);
      if (!targetHand) return;

      // Régénérer le deck si vide
      if (room.deck.length === 0) {
        room.deck = generateDeck();
      }

      const newCard = room.deck.pop();
      targetHand.push(newCard);

      //console.log(`[handleHit] Player ${playerId} position ${targetPosition} hand after draw:`, targetHand);
      const value = calculateHandValue(targetHand);

      broadcastToRoom(room, 'cardDrawn', {
        playerId,
        position: targetPosition,
        card: newCard,
        value
      });

      if (value >= 21) {
        // Main terminée, passer à la suivante
        const positions = Array.from(player.hands.keys()).sort((a, b) => a - b);
        const currentIndex = positions.indexOf(targetPosition);

        if (currentIndex + 1 < positions.length) {
          // Passer à la prochaine main de ce joueur
          room.currentHandPosition = positions[currentIndex + 1];
          nextPlayerTurn(room);
        } else {
          // Toutes les mains de ce joueur sont terminées
          room.currentPlayerIndex++;
          room.currentHandPosition = null;
          nextPlayerTurn(room);
        }
      }
    }

    function handleStand() {
      if (!playerId || !roomId) return;
      const room = gameRooms.get(roomId);
      if (!room) return;

      const player = room.players.get(playerId);
      if (!player) return;

      // Vérifier que c'est bien le tour de ce joueur
      const playerIds = Array.from(room.players.keys());
      const currentPlayerId = playerIds[room.currentPlayerIndex];
      if (currentPlayerId !== playerId) {
        socket.send(JSON.stringify({ event: 'error', data: 'it\'s not your turn \n' }));
        return;
      }

      const targetPosition = room.currentHandPosition;
      //console.log('[handleStand] Player standing on position', targetPosition);

      // Broadcast que le joueur s'arrête pour cette main
      broadcastToRoom(room, 'playerStand', {
        playerId,
        username: player.username,
        position: targetPosition
      });

      // Passer à la prochaine main de ce joueur
      const positions = Array.from(player.hands.keys()).sort((a, b) => a - b);
      //console.log('[handleStand] All positions for this player:', positions);
      const currentIndex = positions.indexOf(targetPosition);
      //console.log('[handleStand] Current index:', currentIndex, 'total positions:', positions.length);

      if (currentIndex + 1 < positions.length) {
        // Passer à la prochaine main de ce joueur
        room.currentHandPosition = positions[currentIndex + 1];
        //console.log('[handleStand] Moving to next hand at position:', room.currentHandPosition);
        nextPlayerTurn(room);
      } else {
        // Toutes les mains de ce joueur sont terminées
        //console.log('[handleStand] All hands done, moving to next player');
        room.currentPlayerIndex++;
        room.currentHandPosition = null;
        nextPlayerTurn(room);
      }
    }

    function handleDouble() {
      if (!playerId || !roomId) return;
      const room = gameRooms.get(roomId);
      if (!room || room.state !== 'playing') return;

      const player = room.players.get(playerId);
      if (!player) return;

      // Vérifier que c'est bien le tour de ce joueur
      const playerIds = Array.from(room.players.keys());
      const currentPlayerId = playerIds[room.currentPlayerIndex];
      if (currentPlayerId !== playerId) {
        socket.send(JSON.stringify({ event: 'error', data: 'Ce n\'est pas votre tour' }));
        return;
      }

      // Utiliser la main courante
      const targetPosition = room.currentHandPosition;
      if (targetPosition === null) return;

      const targetHand = player.hands.get(targetPosition);
      if (!targetHand) return;

      // Vérifier que le joueur a exactement 2 cartes (double down seulement sur main initiale)
      if (targetHand.length !== 2) {
        socket.send(JSON.stringify({ event: 'error', data: 'Double Down n\'est autorisé que sur la main initiale (2 cartes)' }));
        // Ne pas bloquer - le joueur peut continuer avec Hit/Stand
        return;
      }

      // Récupérer et doubler la mise
      const currentBet = player.bets.get(targetPosition) || 0;
      const newBet = currentBet * 2;

      // Vérifier que le joueur a assez d'argent
      if (player.balance < currentBet) {
        socket.send(JSON.stringify({ event: 'error', data: 'Solde insuffisant pour doubler la mise' }));
        // Ne pas bloquer - le joueur peut continuer avec Hit/Stand
        return;
      }

      // Déduire la mise supplémentaire
      player.balance -= currentBet;
      player.bets.set(targetPosition, newBet);

      //console.log(`[handleDouble] Player ${playerId} doubled bet on position ${targetPosition}: ${currentBet} -> ${newBet}`);

      // Régénérer le deck si vide
      if (room.deck.length === 0) {
        room.deck = generateDeck();
      }

      // Tirer exactement une carte
      const newCard = room.deck.pop();
      targetHand.push(newCard);

      //console.log(`[handleDouble] Player ${playerId} position ${targetPosition} hand after double:`, targetHand);
      const value = calculateHandValue(targetHand);

      // Notifier tous les joueurs du double down
      broadcastToRoom(room, 'playerDouble', {
        playerId,
        position: targetPosition,
        newBet,
        card: newCard,
        value,
        balance: player.balance  // NOUVEAU: Envoyer la balance mise à jour
      });

      // Passer automatiquement à la main/joueur suivant (le joueur ne peut plus jouer cette main)
      const positions = Array.from(player.hands.keys()).sort((a, b) => a - b);
      const currentIndex = positions.indexOf(targetPosition);

      if (currentIndex + 1 < positions.length) {
        // Passer à la prochaine main de ce joueur
        room.currentHandPosition = positions[currentIndex + 1];
        nextPlayerTurn(room);
      } else {
        // Toutes les mains de ce joueur sont terminées
        room.currentPlayerIndex++;
        room.currentHandPosition = null;
        nextPlayerTurn(room);
      }
    }

    function dealerTurn(room) {
      room.state = 'dealer_turn';
      
      broadcastToRoom(room, 'dealerReveal', {
        cards: room.dealerHand,
        value: calculateHandValue(room.dealerHand)
      });

      const dealerDrawInterval = setInterval(() => {
        const value = calculateHandValue(room.dealerHand);

        if (value >= 17) {
          clearInterval(dealerDrawInterval);
          finishRound(room);
          return;
        }

        // Régénérer le deck si vide
        if (room.deck.length === 0) {
          room.deck = generateDeck();
        }

        const card = room.deck.pop();
        room.dealerHand.push(card);

        //console.log('[dealerTurn] Dealer hand after draw:', room.dealerHand);
        const dealerValue = calculateHandValue(room.dealerHand);
        //console.log('[dealerTurn] Dealer value:', dealerValue);

        broadcastToRoom(room, 'dealerDraw', {
          card,
          value: dealerValue
        });
      }, 1000);
    }

    function finishRound(room) {
      room.state = 'finished';
      const dealerValue = calculateHandValue(room.dealerHand);

      const results = [];

      room.players.forEach(player => {
        player.hands.forEach((hand, position) => {
          const playerValue = calculateHandValue(hand);
          const bet = player.bets.get(position);
          let result = 'lose';
          let payout = 0;

          if (playerValue > 21) {
            result = 'lose';
          } else if (dealerValue > 21) {
            result = 'win';
            payout = bet * 2;
          } else if (playerValue > dealerValue) {
            result = 'win';
            payout = bet * 2;
          } else if (playerValue === dealerValue) {
            result = 'push';
            payout = bet;
          }

          player.balance += payout;

          results.push({
            playerId: player.id,
            username: player.username,
            position,
            result,
            payout,
            newBalance: player.balance
          });
        });

        // NOUVEAU: Mettre à jour la DB si l'utilisateur est authentifié
        if (player.authenticated && player.dbName) {
          updateUserWallet(player.dbName, player.dbType, player.balance)
            .then(success => {
              if (success) {
                //console.log(`[finishRound] Wallet mis à jour pour ${player.dbName}: ${player.balance}€`);
              } else {
                console.error(`[finishRound] Échec mise à jour wallet pour ${player.dbName}`);
              }
            })
            .catch(err => {
              console.error(`[finishRound] Erreur mise à jour wallet:`, err);
            });
        }
      });

      broadcastToRoom(room, 'roundFinished', {
        dealerValue,
        results
      });

      setTimeout(() => {
        room.state = 'betting';
        room.currentPlayerIndex = 0;
        room.currentHandPosition = null;
        room.players.forEach(p => {
          p.bets.clear();
          p.hands.clear();
          p.ready = false;
        });
        
        broadcastToRoom(room, 'newRound', { message: 'Placez vos paris' });
      }, 5000);
    }

    socket.on('close', () => {
      if (playerId && roomId) {
        const room = gameRooms.get(roomId);
        if (room) {
          room.players.delete(playerId);
          
          if (room.players.size === 0) {
            gameRooms.delete(roomId);
          } else {
            broadcastToRoom(room, 'playerLeft', { playerId });
          }
        }
      }
    });
  });
});

// Démarrer le serveur
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    //console.log('Blackjack service running on http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();