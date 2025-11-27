import { Engine, Scene, Vector3,
  StandardMaterial, Texture,
  AbstractMesh, AssetsManager,
  MultiMaterial, Material
} from "@babylonjs/core";

type Card = {
  name: string;
  mesh: AbstractMesh[];
};

export default class BjCard {
  private scene: Scene;
  private assetsManager: AssetsManager;
  private cardBackMaterial: StandardMaterial;
  private Cards: Card[] = [];
  private CardsMaterials: { name: string; material: StandardMaterial }[] = [];
  private Deck: Card[] = [];
  private DiscardTray: Card[] = [];
  private Places: { [name: string]: {
    cards: Card[];
    position: Vector3;
    rotation: Vector3;
    stackOffset: Vector3;
  }} = {};
  activePlaces: string[] = [];

  // Step: Move from deck
  private dealStep = {position: new Vector3(-0.4, 1.04, 0.15), rotation: new Vector3(-Math.PI, 0, 0)};

  constructor(numberOfDeck: number, scene: Scene, assetsManager: AssetsManager) {
    this.scene = scene;
    this.assetsManager = assetsManager;

    const cardBackTexture = new Texture(`assets/cardBackTexture.png`, this.scene);
    cardBackTexture.vOffset = 0.04; // Adjust texture offset for better alignment
    this.cardBackMaterial = new StandardMaterial(`MatCardBack`, this.scene);
    this.cardBackMaterial.hasTexture(cardBackTexture);
    this.cardBackMaterial.diffuseTexture = cardBackTexture;
    this.cardBackMaterial.emissiveTexture = cardBackTexture;

    const cardsPatterns = ["Spades", "Hearts", "Diamonds", "Clubs"];
    const cardsNames = ["As", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King"];

    let cardsCount = 0;
    for (let d = 0; d < numberOfDeck; d++) {
      cardsPatterns.forEach(pattern => {
        cardsNames.forEach(name => {
          this.createCard(cardsCount);
          this.createCardMaterial(name, pattern);
          cardsCount++;
        });
      });
    }

    this.initPlaces();
  }

  private createCard(index: number) {

    const taskCard = this.assetsManager.addContainerTask("loadGLB", "", "models/", "cardTest.glb");

    taskCard.onSuccess = (taskCard) => {
      taskCard.loadedContainer.addAllToScene();
      const cardMeshes = taskCard.loadedContainer.meshes;

      cardMeshes[2].material = this.cardBackMaterial;
      cardMeshes[2].material.markAsDirty(Material.AllDirtyFlag);

      cardMeshes[0].position = this.dealStep.position.clone();
      cardMeshes[0].position.y -= 0.005;
      cardMeshes[0].rotation = this.dealStep.rotation.clone();
      cardMeshes[0].scaling = new Vector3(0.7, 0.8, 0.8);

      this.Cards.push({
        name: '',
        mesh: cardMeshes
      });
    };

    taskCard.onError = (taskCard, message, exception) => {
      console.error(`Erreur de chargement des cartes :`, message, exception);
    };
  }

  private createCardMaterial(name: string, pattern: string) {
    const cardTexture = new Texture(`assets/${pattern}/${name}.png`, this.scene);
    cardTexture.vOffset = 0.04; // Adjust texture offset for better alignment
    const cardMaterial = new StandardMaterial(`MatCardFront_${name}_of_${pattern}`, this.scene);
    cardMaterial.hasTexture(cardTexture);
    cardMaterial.diffuseTexture = cardTexture;
    cardMaterial.emissiveTexture = cardTexture;

    this.CardsMaterials.push({ name: `${name}_of_${pattern}`, material: cardMaterial });
  }

  async resetDeck() {
    //console.log(`[BjCard] resetDeck called - Deck: ${this.Deck.length}, DiscardTray: ${this.DiscardTray.length}, Cards: ${this.Cards.length}`);

    // Attendre que toutes les cartes soient chargées (4 decks × 52 cartes = 208 cartes)
    const expectedCards = 208;
    let waitTime = 0;
    while (this.Cards.length < expectedCards && waitTime < 10000) {
      //console.log(`[BjCard] Waiting for cards to load... ${this.Cards.length}/${expectedCards}`);
      await this.delay(100);
      waitTime += 100;
    }

    if (this.Cards.length < expectedCards) {
      console.warn(`[BjCard] Only ${this.Cards.length}/${expectedCards} cards loaded after ${waitTime}ms`);
    } else {
      //console.log(`[BjCard] All ${this.Cards.length} cards loaded!`);
    }

    const position = new Vector3(-0.5, 1.04, 0.15);
    const rotation = new Vector3(-Math.PI, 0, Math.PI / 3);
    const offset = new Vector3(-0.002, 0, 0);

    //console.log(`[BjCard] Before concat - Deck: ${this.Deck.length}, DiscardTray: ${this.DiscardTray.length}`);
    let shuffledCards = this.Deck.concat(this.DiscardTray);
    if (!shuffledCards.length) {
      //console.log(`[BjCard] Using initial Cards array (${this.Cards.length} cards)`);
      shuffledCards = this.Cards.slice();
    }

    //console.log(`[BjCard] Shuffling ${shuffledCards.length} cards (expected: 208)`);
    for (let i = shuffledCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
    }

    this.DiscardTray = [];

    // Reverse the array first so we can pop from the end (which is the "top" of the deck)
    shuffledCards.reverse();

    // Assign immediately so deck is available during animation
    this.Deck = shuffledCards;
    //console.log(`[BjCard] Deck assigned with ${this.Deck.length} cards, starting animation...`);

    // Animate the deck stacking (visual only, doesn't affect gameplay)
    for (let i = this.Deck.length - 1; i >= 0; i--) {
      const card = this.Deck[i];
      this.moveCard(card, position, rotation, true, 40).then(() => {
        this.moveCard(card, position.add(offset.scale(i)), rotation, true, 100).then(() => {
          if (card.mesh && card.mesh[0]){
            card.mesh[0].position = position.add(offset.scale(i));
            card.mesh[0].rotation = rotation.clone();
          }
        });
      });
      await this.delay(0.001);
    }

    await this.delay(150);
    //console.log(`[BjCard] resetDeck completed - Deck now has ${this.Deck.length} cards`);
  }

  private initPlaces() {
    this.Places = {
      "dealer": {
        cards: [],
        position: new Vector3(0, 1, 0.32),
        rotation: new Vector3(-Math.PI, Math.PI, Math.PI),
        stackOffset: new Vector3(0.03, 0.0001, 0),
      },
      "p1": {
        cards: [],
        position: new Vector3(0.7, 1, 0.4),
        rotation: new Vector3(-Math.PI, Math.PI + Math.PI / 3, Math.PI),
        stackOffset: new Vector3(-0.007, 0.0001, -0.03),
      },
      "p2": {
        cards: [],
        position: new Vector3(0.4, 1, 0.7),
        rotation: new Vector3(-Math.PI, Math.PI + Math.PI / 6, Math.PI),
        stackOffset: new Vector3(0.007, 0.0001, -0.03),
      },
      "p3": {
        cards: [],
        position: new Vector3(0, 1, 0.8),
        rotation: new Vector3(-Math.PI, Math.PI, Math.PI),
        stackOffset: new Vector3(0.02, 0.0001, -0.02),
      },
      "p4": {
        cards: [],
        position: new Vector3(-0.4, 1, 0.7),
        rotation: new Vector3(-Math.PI, Math.PI - Math.PI / 6, Math.PI),
        stackOffset: new Vector3(0.028, 0.0001, -0.008),
      },
      "p5": {
        cards: [],
        position: new Vector3(-0.7, 1, 0.4),
        rotation: new Vector3(-Math.PI, Math.PI - Math.PI / 3, Math.PI),
        stackOffset: new Vector3(0.028, 0.0001, 0.008),
      },
    };
  }

  private delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
  }

  private normalizeVector3Angles(v: Vector3): Vector3 {
    const normalizeAngle = (angle: number) => {
      while (angle > Math.PI) angle -= 2 * Math.PI;
      while (angle < -Math.PI) angle += 2 * Math.PI;
      return angle;
    };
    return new Vector3(
      normalizeAngle(v.x),
      normalizeAngle(v.y),
      normalizeAngle(v.z)
    );
  }

  private async moveCard(card: Card, position: Vector3, rotation: Vector3, withoutStep = false, timeTo = 500) {

    if (!withoutStep) {
      await this.moveCard(card, this.dealStep.position, this.dealStep.rotation, true, 100);
    }

    const deltaTime = 16; // Approx. 60 FPS (16.67ms per frame)
    const steps = Math.floor(timeTo / deltaTime);
    const stepPosition = position.subtract(card.mesh[0]?.position !== undefined ? card.mesh[0].position : new Vector3(0,0,0)).scale(1 / steps);
    const stepRotation = this.normalizeVector3Angles(rotation.subtract(card.mesh[0]?.rotation !== undefined ? card.mesh[0].rotation : new Vector3(0,0,0))).scale(1 / steps);
    
    for (let i = 1; i <= steps; i++) {
      if (card.mesh && card.mesh[0]){
        card.mesh[0].position = card.mesh[0].position.add(stepPosition);
        card.mesh[0].rotation = card.mesh[0].rotation.add(stepRotation);
        await this.delay(deltaTime);
      }
    }
  }

  private discardTrayPosition = new Vector3(0, 1, 0);

  cleanPlaces() {
    //console.log(`[BjCard] cleanPlaces called - Current DiscardTray size: ${this.DiscardTray.length}, Deck size: ${this.Deck.length}`);
    let cardsCollected = 0;

    Object.values(this.Places).forEach(place => {
      place.cards.forEach(card => {
        if (card.mesh && card.mesh[0]){
          this.moveCard(card, this.discardTrayPosition, card.mesh[0].rotation, true);
          this.DiscardTray.push(card);
          cardsCollected++;
        }
      });
      place.cards = [];
    });
    //console.log(`[BjCard] cleanPlaces done - Collected ${cardsCollected} cards, DiscardTray now: ${this.DiscardTray.length}, Deck: ${this.Deck.length}, Total: ${this.DiscardTray.length + this.Deck.length}`);
  }

  async dealPlace(cardName: string, placeName: string) {
    const place = this.Places[placeName];
    if (!place) {
      console.error(`Unknown place: ${placeName}`);
      return;
    }

    //console.log(`[BjCard] dealPlace called for ${cardName} to ${placeName}, Deck size: ${this.Deck.length}`);

    let waitCount = 0;
    while (!this.Deck.length) {
      waitCount++;
      if (waitCount > 500) { // 5 secondes max
        console.error(`[BjCard] Deck is still empty after 5s! Cannot deal ${cardName}`);
        return;
      }
      await this.delay(10);
    }

    if (waitCount > 0) {
      //console.log(`[BjCard] Had to wait ${waitCount * 10}ms for deck to be ready`);
    }

    const card = this.Deck.shift()!;
    //console.log(`[BjCard] Dealing ${cardName}, remaining cards in deck: ${this.Deck.length}`);

    const cardMaterial = this.CardsMaterials.find(mat => mat.name === cardName);
    if (!cardMaterial) {
      console.error(`Unknown card name: ${cardName}`);
      return;
    }
    card.name = cardName;
    if (card.mesh && card.mesh[1]){
      card.mesh[1].material = cardMaterial.material;
      card.mesh[1].material.markAsDirty(Material.AllDirtyFlag);
    }


    let cardStack = place.cards;

    //console.log(`[BjCard] Dealing card to ${placeName}, cardStack.length = ${cardStack.length}`);

    // Utiliser la logique normale pour toutes les positions, y compris le dealer
    const offset = place.stackOffset.scale(cardStack.length);
    //console.log(`[BjCard] Offset for card ${cardStack.length}:`, offset);

    if (placeName === 'dealer') {
      if (cardStack.length === 0) {
        // Carte 0: face cachée, hauteur +1
        const elevatedOffset = offset.add(new Vector3(0, 0.002, 0));
        this.moveCard(card, place.position.add(elevatedOffset), place.rotation.add(new Vector3(0, 0, -Math.PI)), false, 300);
      } else if (cardStack.length === 1) {
        // Carte 1: visible, hauteur 0 (normale)
        this.moveCard(card, place.position.add(offset), place.rotation);
      } else {
        // Cartes 2+: de l'autre côté avec le même espacement, au-dessus de carte 0
        // Utiliser -stackOffset pour aller dans la direction opposée
        const reversedStackOffset = place.stackOffset.scale(-1);
        const flippedOffset = place.position.add(reversedStackOffset.scale(cardStack.length - 1)).add(new Vector3(0, 0.004, 0));
        this.moveCard(card, flippedOffset, place.rotation);
      }
    } else {
      this.moveCard(card, place.position.add(offset), place.rotation);
    }
    cardStack.push(card);

    await this.delay(300);
  }

  async turnDealerCard() {
    const place = this.Places["dealer"];

    // Attendre que les cartes du dealer soient distribuées (max 2 secondes)
    let retries = 20;
    while ((!place.cards || place.cards.length < 1) && retries > 0) {
      //console.log('[BjCard] turnDealerCard: waiting for dealer cards...', place.cards);
      await this.delay(100);
      retries--;
    }

    // Vérifier que le dealer a bien au moins 1 carte
    if (!place.cards || place.cards.length < 1) {
      console.error('[BjCard] turnDealerCard: dealer does not have cards yet after waiting', place.cards);
      return;
    }

    //console.log('[BjCard] turnDealerCard: turning card', place.cards[0]);
    // Retourner la première carte (index 0) qui est face cachée
    if (place.cards[0] && place.cards[0].mesh[0])
      this.moveCard(place.cards[0], place.cards[0].mesh[0].position, place.rotation, true);
  }
}