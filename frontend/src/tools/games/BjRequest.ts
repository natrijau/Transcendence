const { apiFetch } = await import('../APIStorageManager');
const { navigate } = await import('../../router');

type PlacesBet = { [place: string]: { bet: number } };

type WsMessage = {
  event: string;
  data?: any;
  gameId?: string;
  playerId?: string;
};

// Helper pour calculer la valeur d'une carte
function getCardValue(card: string): number {
  // Format backend: "As_of_Spades", "10_of_Hearts", "Jack_of_Diamonds", etc.
  const name = card.split('_of_')[0];
  //console.log('[getCardValue] Card:', card, 'Name:', name);

  if (name === 'As') return 11; // As vaut 11 par défaut
  if (['Jack', 'Queen', 'King'].includes(name)) return 10;

  const value = parseInt(name);
  return isNaN(value) ? 0 : value;
}

const API_URL: string = ((import.meta as any).env?.VITE_BJ_API_URL || 'http://localhost:3000');
// Utiliser le proxy Vite pour les WebSockets - connexion relative à l'hôte actuel
const WS_URL: string = ((import.meta as any).env?.VITE_BJ_WS_URL || (window.location.protocol === 'https:' ? `wss://${window.location.host}/ws/blackjack` : `ws://${window.location.host}/ws/blackjack`));

const state: {
  ws: WebSocket | null;
  gameId: string;
  playerId: string;
  isOpen: boolean;
  joined: boolean;
  queue: WsMessage[];
} = {
  ws: null,
  gameId: '',
  playerId: '',
  isOpen: false,
  joined: false,
  queue: []
};

function dispatch(name: string, detail?: any): void {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {}
}

async function http(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${API_URL}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}

function sendWs(message: WsMessage): void {
  // Toujours autoriser join immédiatement
  if (message.event !== 'join' && !state.joined) {
    state.queue.push(message);
    return;
  }
  if (state.ws && state.isOpen) state.ws.send(JSON.stringify(message));
  else state.queue.push(message);
}

function onWsMessage(ev: MessageEvent<string>): void {
  let msg: WsMessage;
  try { msg = JSON.parse(ev.data); } catch { return; }
  switch (msg.event) {
    case 'joined': {
      // Le backend génère son propre playerId, on doit l'utiliser
      if (msg.data && msg.data.playerId) {
        state.playerId = msg.data.playerId;
        //console.log('[BjRequest] Updated playerId from backend:', state.playerId);
      }

      // NOUVEAU: Récupérer la balance initiale du backend (depuis la DB)
      if (msg.data?.balance !== undefined) {
        //console.log(`[BjRequest] Balance initiale reçue depuis DB: ${msg.data.balance}`);
        dispatch('bj:updateBalance', { balance: msg.data.balance });
      }

      state.joined = true;
      // Flush messages en attente maintenant que le joueur est inscrit côté serveur
      for (const m of state.queue.splice(0)) {
        if (m.event !== 'join') sendWs(m);
      }
      break;
    }
    case 'betPlaced': {
      // Le backend envoie la nouvelle balance après chaque mise
      if (msg.data && msg.data.playerId === state.playerId && msg.data.balance !== undefined) {
        //console.log(`[BjRequest] Bet placed, nouvelle balance: ${msg.data.balance}`);
        dispatch('bj:updateBalance', { balance: msg.data.balance });
      }
      break;
    }
    case 'roundStarted': {
      // Le backend envoie gameState avec les mains des joueurs
      const gameState = msg.data;
      //console.log('[BjRequest] roundStarted data:', JSON.stringify(gameState, null, 2));
      //console.log('[BjRequest] Current state.playerId:', state.playerId);

      // Distribuer les cartes du dealer
      //console.log('[BjRequest] gameState.dealerCards:', gameState?.dealerCards);
      if (gameState && gameState.dealerCards && gameState.dealerCards.length >= 2) {
        //console.log('[BjRequest] Dealing dealer cards:', gameState.dealerCards);
        // Calculer la valeur de la première carte visible du dealer
        const firstCardValue = getCardValue(gameState.dealerCards[0]);
        //console.log('[BjRequest] Dealer first card value:', firstCardValue);
        // Distribuer la première carte avec sa valeur
        dealPlace(gameState.dealerCards[0], 'dealer', String(firstCardValue));
        // Distribuer la deuxième carte face cachée (sans valeur)
        dealPlace(gameState.dealerCards[1], 'dealer', '');
      } else {
        console.error('[BjRequest] No dealer cards to deal! gameState:', gameState);
      }

      if (gameState && gameState.players) {
        // Traiter les cartes initiales de chaque joueur
        //console.log('[BjRequest] Searching for player with id:', state.playerId);
        const player = gameState.players.find((p: any) => p.id === state.playerId);
        //console.log('[BjRequest] Player found:', player);

        if (player && player.hands) {
          Object.entries(player.hands).forEach(([position, handData]: [string, any]) => {
            // Convertir position numérique (1, 2, 3...) en format "p1", "p2", "p3"...
            const positionStr = `p${position}`;
            //console.log('[BjRequest] Dealing to position:', positionStr, 'cards:', handData.cards);
            if (handData.cards && Array.isArray(handData.cards)) {
              handData.cards.forEach((card: string, index: number) => {
                //console.log(`[BjRequest] Dealing card ${index}: ${card} to position ${positionStr}`);
                dealPlace(card, positionStr, String(handData.value));
              });
            }
          });
        } else {
          console.error('[BjRequest] No player hands found! player:', player);
        }
      }
      dispatch('bj:actions:show');
      break;
    }
    case 'cardDrawn': {
      const d = msg.data;
      if (d && d.card && d.position) {
        // Convertir position numérique en format "p1", "p2", etc.
        const positionStr = `p${d.position}`;
        //console.log(`[BjRequest] cardDrawn: ${d.card} to position ${positionStr}, value: ${d.value}`);
        dealPlace(String(d.card), positionStr, String(d.value ?? ''));
      }
      break;
    }
    case 'playerDouble': {
      const d = msg.data;
      if (d && d.card && d.position) {
        // Convertir position numérique en format "p1", "p2", etc.
        const positionStr = `p${d.position}`;
        //console.log(`[BjRequest] playerDouble: ${d.card} to position ${positionStr}, new bet: ${d.newBet}, value: ${d.value}, balance: ${d.balance}`);
        // Distribuer la carte
        dealPlace(String(d.card), positionStr, String(d.value ?? ''));
        // Mettre à jour l'affichage de la mise
        if (d.newBet !== undefined) {
          dispatch('bj:updateBet', { place: positionStr, newBet: d.newBet });
        }
        // NOUVEAU: Mettre à jour la balance si c'est notre joueur
        if (d.playerId === state.playerId && d.balance !== undefined) {
          //console.log(`[BjRequest] Double down, nouvelle balance: ${d.balance}`);
          dispatch('bj:updateBalance', { balance: d.balance });
        }
        // Cacher les boutons car le double a réussi et la main est terminée
        if (d.playerId === state.playerId) {
          dispatch('bj:actions:hide');
        }
      }
      break;
    }
    case 'dealerReveal': {
      const dealerData = msg.data;
      if (dealerData && dealerData.value) {
        turnDealerCard(String(dealerData.value));
      }
      dispatch('bj:actions:hide');
      break;
    }
    case 'dealerDraw': {
      const dealerData = msg.data;
      if (dealerData && dealerData.card) {
        //console.log('[BjRequest] Dealer draws card:', dealerData.card, 'new value:', dealerData.value);
        // Distribuer la nouvelle carte au dealer
        dealPlace(dealerData.card, 'dealer', String(dealerData.value));
      }
      break;
    }
    case 'roundFinished': {
      const results = msg.data?.results || [];
      const resultMap: { [place: string]: 'win' | 'lose' | 'push' } = {};
      let newBalance: number | undefined;

      results.forEach((r: any) => {
        if (r.playerId === state.playerId && r.position) {
          // Convertir position numérique en format "p1", "p2", etc.
          const positionStr = `p${r.position}`;
          resultMap[positionStr] = r.result;
          // Récupérer la nouvelle balance (sera la même pour tous les résultats du joueur)
          if (r.newBalance !== undefined) {
            newBalance = r.newBalance;
          }
        }
      });
      //console.log('[BjRequest] Round finished, results:', resultMap, 'newBalance:', newBalance);

      // Mettre à jour la balance si disponible
      if (newBalance !== undefined) {
        dispatch('bj:updateBalance', { balance: newBalance });
      }

      endRound(resultMap);
      dispatch('bj:actions:hide');
      dispatch('bj:resetActivePlaces');
      break;
    }
    case 'playerTurn': {
      const turnData = msg.data;
      if (turnData && turnData.playerId === state.playerId) {
        dispatch('bj:actions:show');
        // Highlighter la place active si une position est spécifiée
        if (turnData.position) {
          const positionStr = `p${turnData.position}`;
          //console.log(`[BjRequest] Player turn for position: ${positionStr}`);
          dispatch('bj:setActivePlace', { place: positionStr });
        }
      }
      break;
    }
    case 'error': {
      // Ignorer silencieusement les erreurs (ex: double non autorisé)
      // Le joueur peut continuer à jouer avec Hit/Stand
      //console.log('[WS][Blackjack] Error:', msg.data || msg);
      break;
    }
    default:
      break;
  }
}

export async function connect(params: { gameId: string; playerId: string; playerName: string; bank: number; position: string; }): Promise<void> {
  state.gameId = params.gameId;
  state.playerId = params.playerId;

  if (!state.ws || state.ws.readyState > 1) {
    //console.log('[BjRequest] Connecting to WebSocket:', WS_URL);

    const response = await apiFetch('/api/user/id', { method: 'GET' });
    if (!response.ok) {
      navigate('/');
      throw new Error('Token validation failed');
    }
    state.ws = new WebSocket(WS_URL);
    state.isOpen = false;
    state.joined = false;
    state.queue = [];
    state.ws.onopen = () => {
      //console.log('[BjRequest] WebSocket connected!');
      state.isOpen = true;
      // Toujours joindre la partie en premier
      const joinMessage = {
        event: 'join',
        data: {
          gameId: state.gameId,
          playerId: state.playerId,
          username: params.playerName,
          mode: 'solo'
        }
      };
      //console.log('[BjRequest] Sending join:', joinMessage);
      sendWs(joinMessage);
    };
    state.ws.onmessage = onWsMessage;
    state.ws.onerror = (err) => {
      console.error('[BjRequest] WebSocket error:', err);
    };
    state.ws.onclose = () => {
      //console.log('[BjRequest] WebSocket closed');
      state.isOpen = false;
    };
  }
}

export function disconnect() {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    //console.log('[BjRequest] Disconnecting WebSocket...');
    state.ws.close(1000, 'Page navigation');
    state.ws = null;
    state.isOpen = false;
    state.joined = false;
  }
}

// Enregistrer la fonction disconnect globalement pour le routeur
(window as any).__bjDisconnect = disconnect;

export const BjRequest = {
  send: {
    playerBet,
    start,
    stand,
    hit,
    doubleDown
  },
  receive: {
    resetDeck,
    dealPlace,
    cardInteraction,
    turnDealerCard,
    popUpBJ,
    popUpBust,
    endRound
  }
};

function ensureConnected(): void {
  if (!state.ws) throw new Error('WebSocket non initialisé. Appelle connect() avant.');
}

// Send

async function playerBet(player: string, places: PlacesBet): Promise<void> {
  // Ne pas écraser le playerId reçu du backend
  // state.playerId est déjà défini par le message 'joined'
  ensureConnected();

  // Le backend attend une position (1-5) et un amount
  // places est un objet comme { "p1": { bet: 100 } }
  Object.entries(places).forEach(([position, betData]) => {
    // Convertir position "p1", "p2" etc. en numéro 1, 2, etc.
    const posNum = parseInt(position.replace('p', '')) || 1;
    sendWs({
      event: 'placeBet',
      data: {
        position: posNum,
        amount: betData.bet
      }
    });
  });
}

async function start(): Promise<void> {
  ensureConnected();
  sendWs({ event: 'startGame', data: {} });
}

async function stand(): Promise<void> {
  ensureConnected();
  sendWs({ event: 'stand', data: {} });
}

async function hit(): Promise<void> {
  ensureConnected();
  sendWs({ event: 'hit', data: {} });
}

async function doubleDown(): Promise<void> {
  ensureConnected();
  sendWs({ event: 'double', data: {} });
}

// Receive

function resetDeck(): void {
  dispatch('bj:resetDeck');
}

function dealPlace(card: string, place: string, placeCardsValue: string): void {
  dispatch('bj:dealPlace', { card, place, placeCardsValue });
}

function cardInteraction(place: string): void {
  dispatch('bj:cardInteraction', { place });
}

function turnDealerCard(cardsValue: string): void {
  dispatch('bj:turnDealerCard', { cardsValue });
}

function popUpBJ(place: string): void {
  dispatch('bj:popUpBJ', { place });
}

function popUpBust(place: string): void {
  dispatch('bj:popUpBust', { place });
}

function endRound(results: { [place: string]: 'win' | 'lose' | 'push' }): void {
  dispatch('bj:endRound', { results });
}