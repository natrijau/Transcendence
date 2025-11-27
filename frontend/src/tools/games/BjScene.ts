import { Engine, Scene,
  HemisphericLight,
  Vector3, Color3, GlowLayer,
  StandardMaterial, AssetsManager,
  ArcRotateCamera, MeshBuilder,
  ParticleSystem, Mesh,
  Texture, Color4, AbstractMesh
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF"; // nécessaire pour le support GLTF/GLB
import BjCard from "./BjCard";
import BjGui from "./BjGui";
// import { ThinParticleSystem } from "@babylonjs/core/Particles/thinParticleSystem";

export default class BjScene {

  canvas: HTMLCanvasElement;
  // size: { width: number; height: number; };
  engine: Engine;
  scene: Scene;
  camera: ArcRotateCamera;
  lights: HemisphericLight[] = [];
  fontParticles: ParticleSystem;
  purpleColor = new Color3(0.5, 0.2, 0.5);
  purpleMat: StandardMaterial;
  transparentMat: StandardMaterial;
  assetsManager: AssetsManager;
  reactors: {
    left: { reactor: AbstractMesh; particles: ParticleSystem; };
    right: { reactor: AbstractMesh; particles: ParticleSystem; };
  };
  Cards: BjCard;
  Places: { [place: string]: {
    camera: ArcRotateCamera | null;
    meshes: {
      ballMesh: Mesh;
      placeAreaMesh: Mesh;
      coinMesh: AbstractMesh[] | null;
      coinAreaMesh: Mesh | null;
    }
  }};
  CoinMaterials: { [name: string]: StandardMaterial; };

  currentChoosenPlaces: string[] = [];

  gui: BjGui;

  initCamera: { beta: number, radius: number };
  initFontParticlesEmitPower: number ;

  initCinematicCamera: { beta: number, radius: number };
  initCinematicFontParticlesEmitPower: number ;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.engine = new Engine(canvas, true);

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.035, 0.02, 0.05, 1); // Couleur de fond

    this.initCamera = { beta: Math.PI / 2 - Math.PI / 3.7, radius: 0.7 };
    this.initCinematicCamera = { beta: Math.PI / 2, radius: 2.1 };

    // Camera
    this.camera = new ArcRotateCamera(
      "camera", Math.PI / 2,
      this.initCinematicCamera.beta,
      this.initCinematicCamera.radius,
      new Vector3(0, 1.5, 1.2), this.scene);
    // this.camera.attachControl(canvas, true);

    // Lights
    const light1 = new HemisphericLight("light1", new Vector3(0, 2, -1), this.scene);
    light1.intensity = 0.05;
    this.lights.push(light1);
    const light2 = new HemisphericLight("light2", new Vector3(-3, 1, 1), this.scene);
    light2.intensity = 0.05;
    this.lights.push(light2);
    const light3 = new HemisphericLight("light3", new Vector3(3, 1, 1), this.scene);
    light3.intensity = 0.05;
    this.lights.push(light3);

    // Glow
    const glow = new GlowLayer("glow", this.scene);
    glow.intensity = 0.2; // Intensité de l'effet de glow
    
    // urlTexture
    const sphericalTexture = new Texture("https://playground.babylonjs.com/textures/flare.png", this.scene);

    this.initFontParticlesEmitPower = 7;
    this.initCinematicFontParticlesEmitPower = 10;

    // Particules pour le fond
   {  const fontParticulesColor = this.purpleColor.toColor4(); // Purple color
      this.fontParticles = new ParticleSystem("fontParticles",50000, this.scene);
      this.fontParticles.particleTexture = sphericalTexture;
      this.fontParticles.emitter = new Vector3(0, 0, -10); // Position de l'émetteur
      this.fontParticles.minEmitBox = new Vector3(0, 0, 0);
      this.fontParticles.maxEmitBox = new Vector3(0, 0, 0);
      this.fontParticles.minEmitPower = this.initCinematicFontParticlesEmitPower;
      this.fontParticles.maxEmitPower = this.initCinematicFontParticlesEmitPower;
      this.fontParticles.direction1 = new Vector3(1, 1, 1);
      this.fontParticles.direction2 = new Vector3(-1, -1, -1);
      this.fontParticles.color1 = fontParticulesColor;
      this.fontParticles.addColorGradient(0, Color3.Black().toColor4());
      this.fontParticles.addColorGradient(0.1, fontParticulesColor, Color3.White().toColor4());
      this.fontParticles.addColorGradient(0.9, Color3.Black().toColor4());
      this.fontParticles.minSize = 0.02;
      this.fontParticles.maxSize = 0.02;
      this.fontParticles.minLifeTime = 10;
      this.fontParticles.maxLifeTime = 10;
      this.fontParticles.emitRate = 1000;
      this.fontParticles.start();
    }

    this.purpleMat = new StandardMaterial("purpleMat", this.scene);
    this.purpleMat.diffuseColor = this.purpleColor;
    this.purpleMat.emissiveColor = this.purpleColor;

    this.transparentMat = new StandardMaterial("transparentMat", this.scene);
    this.transparentMat.diffuseColor = Color3.White();
    this.transparentMat.alpha = 0;

    this.assetsManager = new AssetsManager(this.scene);

    this.loadTableMesh();
    
    this.reactors = {
      left: this.createReactor("ReactorLeftParticles", new Vector3(-1.2, 0.985, 0), sphericalTexture),
      right: this.createReactor("ReactorRightParticles", new Vector3(1.2, 0.985, 0), sphericalTexture)
    };

    this.Cards = new BjCard(4, this.scene, this.assetsManager);

    this.Places = {
      "p1": this.createPlace("p1", new Vector3(0.7, 1, 0.4), new Vector3(-Math.PI / 2, Math.PI / 3, Math.PI), new Vector3(0.84, 1, 0.48)),
      "p2": this.createPlace("p2", new Vector3(0.408, 1, 0.695), new Vector3(-Math.PI / 2, Math.PI / 6.5, Math.PI), new Vector3(0.48, 1, 0.84)),
      "p3": this.createPlace("p3", new Vector3(0, 1, 0.8), new Vector3(-Math.PI / 2, 0, Math.PI), new Vector3(0, 1, 0.96)),
      "p4": this.createPlace("p4", new Vector3(-0.408, 1, 0.695), new Vector3(-Math.PI / 2, -Math.PI / 6.5, Math.PI), new Vector3(-0.48, 1, 0.84)),
      "p5": this.createPlace("p5", new Vector3(-0.7, 1, 0.4), new Vector3(-Math.PI / 2, -Math.PI / 3, Math.PI), new Vector3(-0.84, 1, 0.48)),
      "dealers": this.createPlace("dealers", new Vector3(0, 1, 0.32), new Vector3(-Math.PI / 2, 0, Math.PI))
    };
    
    this.scene.activeCamera = this.camera;

    this.placesMeshVisibility(false);

    this.CoinMaterials = {
      "5": this.initCoinMaterials("5"),
      "10": this.initCoinMaterials("10"),
      "20": this.initCoinMaterials("20"),
      "50": this.initCoinMaterials("50"),
      "100": this.initCoinMaterials("100")
    };

    // Initialiser le deck après le chargement des assets
    this.assetsManager.onFinish = async (tasks) => {
      //console.log('[BjScene] Assets loaded, initializing deck...');
      await this.Cards.resetDeck();
      //console.log('[BjScene] Deck ready!');
    };

    this.assetsManager.load();

    const guiFunctions = {
      endOfBetting: this.endOfBetting.bind(this),
      addChoosenPlace: this.addChoosenPlace.bind(this),
      getPlaceAreaMesh: this.getPlaceAreaMesh.bind(this),
      getCoinAreaMesh: this.getCoinAreaMesh.bind(this),
      setCameraToPlace: this.setCameraToPlace.bind(this),
      setCoinMaterial: this.setCoinMaterial.bind(this),
      hideCoinMesh: this.hideCoinMesh.bind(this),
      resetPlaces: this.resetPlaces.bind(this),
      resetDeck: this.Cards.resetDeck.bind(this.Cards),
      dealPlace: this.Cards.dealPlace.bind(this.Cards),
      turnDealerCard: this.Cards.turnDealerCard.bind(this.Cards)
    }

    this.gui = new BjGui(canvas.width, canvas.height, guiFunctions);

    this.render();
  }

  start() {
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  stop() {
    this.engine.dispose();
    this.scene.dispose();
  }

  private stepProgression(step: number, startValue: number, endValue: number) {
    return startValue + (endValue - startValue) * step;
  }

  playCinematic(duration: number, elapsedTime: number, deltaTime: number) {

    elapsedTime += deltaTime;
    const step = Math.min(elapsedTime / duration, 1);
    // Camera
    this.camera.beta = this.stepProgression(step, this.initCinematicCamera.beta, this.initCamera.beta);
    this.camera.radius = this.stepProgression(step, this.initCinematicCamera.radius, this.initCamera.radius);
    // Font particles
    this.fontParticles.minEmitPower = this.stepProgression(step, this.initCinematicFontParticlesEmitPower, this.initFontParticlesEmitPower);
    this.fontParticles.maxEmitPower = this.stepProgression(step, this.initCinematicFontParticlesEmitPower, this.initFontParticlesEmitPower);
    // Reactors
    this.reactors.left.reactor.position.x = this.stepProgression(step, -1.2, -1.12);
    this.reactors.right.reactor.position.x = this.stepProgression(step, 1.2, 1.12);
    // Reactors Particles
    Object.values(this.reactors).forEach(reactor => {
      reactor.particles.minEmitPower = this.stepProgression(step, 1, 0);
      reactor.particles.maxEmitPower = this.stepProgression(step, 1, 0);
    });
    // Lights
    this.lights[0].intensity = this.stepProgression(step, 0.05, 0.2);
    this.lights[1].intensity = this.stepProgression(step, 0.05, 0.4);
    this.lights[2].intensity = this.stepProgression(step, 0.05, 0.3);
    if (elapsedTime >= duration) {
      // Stop reactors particles
      this.reactors.left.particles.stop();
      this.reactors.right.particles.stop();
      Object.values(this.Places).forEach(place => {
        place.meshes.placeAreaMesh.isVisible = true;
        if (place.meshes.coinAreaMesh) place.meshes.coinAreaMesh.isVisible = true;
      });
      // Show GUI elements
      this.placesMeshVisibility(true);
      this.gui.constGuiVisibility(true);
      this.gui.betGuiVisibility(true);

      this.Cards.resetDeck();
    }
    return elapsedTime;
  }

  private render() {
    let elapsedTime = 0;
    let cinematicEndUp = false;

    this.scene.onBeforeRenderObservable.add(() => {
      const deltaTime = this.engine.getDeltaTime(); // en millisecondes

      if (!this.gui.started())
        return;
        // buttonPlay.isVisible = false; // for debugging
      
      // Cinematic
      if (!cinematicEndUp) {
        elapsedTime = this.playCinematic(3000, elapsedTime, deltaTime);
        if (elapsedTime >= 3000)
          cinematicEndUp = true;
      }
    });
  }

  private loadTableMesh() {
    const taskTable = this.assetsManager.addContainerTask("loadGLB", "", "models/", "floatingBlackjackTable.glb");

    taskTable.onSuccess = (taskTable) => {
      taskTable.loadedContainer.addAllToScene();
      // Container elements: Table, ArmRest, DealersBand
      // Principal material
      const material = new StandardMaterial("material", this.scene);
      material.diffuseColor = new Color3(119/255, 70/255, 52/255);

      taskTable.loadedContainer.meshes.find(mesh => mesh.name === "ArmRest")!.material = material;
      taskTable.loadedContainer.meshes.find(mesh => mesh.name === "DealersBand")!.material = material;
    };

    taskTable.onError = (taskTable, message, exception) => {
        console.error("Erreur de chargement :", message, exception);
    };
  }

  private createReactor(name: string, position: Vector3, particlesTexture: Texture) {
    // Reactor
    const reactor = MeshBuilder.CreateSphere(name, { diameter: 0.15, arc: 0.5 }, this.scene);
    reactor.position = position;
    reactor.material = this.purpleMat;
    const cap = MeshBuilder.CreateDisc("cap", {radius: 0.075, tessellation: 32 }, this.scene);
    cap.parent = reactor;
    cap.rotation.x = Math.PI; // à ajuster selon l'orientation
    cap.material = this.purpleMat; // autre matériau (par exemple rouge)

    // Reactor Particles
    const particles = new ParticleSystem(name, 500, this.scene);
    particles.particleTexture = particlesTexture;
    particles.emitter = position; // Position de l'émetteur
    particles.minEmitBox = new Vector3(0, 0, 0);
    particles.maxEmitBox = new Vector3(0, 0, 0);
    particles.direction1 = new Vector3(0, 0, 1);
    particles.direction2 = new Vector3(0, 0, 1);
    particles.minLifeTime = 1;
    particles.maxLifeTime = 1;
    particles.emitRate = 100;
    particles.minEmitPower = 1.5;
    particles.maxEmitPower = 1.5;
    particles.minSize = 0.2;
    particles.maxSize = 0.2;
    particles.addSizeGradient(0, 0.2);
    particles.addSizeGradient(0.5, 0.1);
    particles.addSizeGradient(1, 0);
    particles.addColorGradient(0, this.purpleColor.toColor4(1));
    particles.addColorGradient(0.9, Color3.Black().toColor4(1));
    particles.start();

    return {reactor, particles};
  }
  
  private loadCoinMesh(
    position: Vector3,
    onReady: (meshes: AbstractMesh[]) => void
  ): AbstractMesh[] {
    const taskCoin = this.assetsManager.addContainerTask("loadGLB", "", "models/", "Coin5.glb");

    let coinMeshes: AbstractMesh[] = [];

    taskCoin.onSuccess = (taskCoin) => {
      taskCoin.loadedContainer.addAllToScene();
      coinMeshes = taskCoin.loadedContainer.meshes;
      coinMeshes.forEach(mesh => mesh.material = this.transparentMat);

      coinMeshes[0].scaling = new Vector3(0.025, 0.025, 0.025);
      coinMeshes[0].position = position;
      coinMeshes[0].rotation = new Vector3(0, 0, Math.PI);

      onReady(coinMeshes);
    };

    taskCoin.onError = (taskCoin, message, exception) => {
      console.error(`Erreur de chargement des pièces :`, message, exception);
    };

    return coinMeshes;
  }

  private createPlace(name: string, placePosition: Vector3, rotation: Vector3, coinPosition?: Vector3) {
    const ballMesh = MeshBuilder.CreateSphere(name + "PlaceMesh", { diameter: 0.02 }, this.scene);
    ballMesh.position = placePosition;
    ballMesh.material = this.purpleMat;

    const placeAreaMesh = MeshBuilder.CreateDisc(name + "SelectPlace", { radius: 0.205 }, this.scene);
    placeAreaMesh.position = placePosition;
    placeAreaMesh.rotation = rotation;
    placeAreaMesh.isVisible = false;
    let coinMesh: AbstractMesh[] | null = null;
    let coinAreaMesh: Mesh | null = null;
    let camera: ArcRotateCamera | null = null;

    if (coinPosition) {
      coinMesh = this.loadCoinMesh(coinPosition, (meshes) => {
        this.Places[name].meshes.coinMesh = meshes;
      });

      coinAreaMesh = MeshBuilder.CreateDisc(name + "CoinPlace", { radius: 0.05 }, this.scene);
      coinAreaMesh.position = coinPosition;
      coinAreaMesh.position._y += 0.0001; // Slightly above the selectMesh to avoid z-fighting
      coinAreaMesh.rotation = rotation;
      coinAreaMesh.isVisible = false;

      camera = new ArcRotateCamera(name + "Camera", Math.PI / 2 - rotation.y, Math.PI / 5, 2.55, new Vector3(), this.scene);
    }

    return {
      camera,
      meshes: {
        ballMesh,
        placeAreaMesh,
        coinMesh,
        coinAreaMesh
      }
    };
  }

  private initCoinMaterials(textureName: string): StandardMaterial {
    const MatCoinTexture = new Texture(`assets/${textureName}.png`, this.scene);
    MatCoinTexture.uOffset = 0.04; // Adjust texture offset for better alignment
    const MatCoin = new StandardMaterial(`MatCoin${textureName}`, this.scene);
    MatCoin.hasTexture(MatCoinTexture);
    MatCoin.diffuseTexture = MatCoinTexture;
    MatCoin.emissiveTexture = MatCoinTexture;
    return MatCoin;
  }

  private placesMeshVisibility(visible: boolean) {
    Object.values(this.Places).forEach(place => {
      place.meshes.ballMesh.isVisible = visible;
    });
  }

  async endOfBetting() {
    this.currentChoosenPlaces.reverse();

    this.Places["dealers"].meshes.ballMesh.material = this.transparentMat;
    this.currentChoosenPlaces.forEach(place => {
      this.Places[place].meshes.ballMesh.material = this.transparentMat;
    });

    // La distribution est désormais pilotée par le backend via les événements BjRequest
    // On ne lance plus de dealing local ici.
  }

  addChoosenPlace(place: string) {
    this.currentChoosenPlaces.push(place);
  }

  getPlaceAreaMesh(place: string) {
    return this.Places[place].meshes.placeAreaMesh;
  }

  getCoinAreaMesh(place: string) {
    return this.Places[place].meshes.coinAreaMesh;
  }

  setCameraToPlace(place: string) {
    if (place === "default") {
      this.scene.activeCamera = this.camera;
      return;
    }
    this.scene.activeCamera = this.Places[place].camera!;
  }

  setCoinMaterial(place: string, bet: number) {
    let matName = "5";
    if (bet >= 100) matName = "100";
    else if (bet >= 50) matName = "50";
    else if (bet >= 20) matName = "20";
    else if (bet >= 10) matName = "10";
    this.Places[place].meshes.coinMesh?.forEach(coin => coin.material = this.CoinMaterials[matName]);
  }

  hideCoinMesh(place: string) {
    this.Places[place].meshes.coinMesh?.forEach(coin => coin.material = this.transparentMat);
  }

  resetPlaces() {
    this.Cards.cleanPlaces();

    Object.values(this.Places).forEach(place => {
      place.meshes.ballMesh.material = this.purpleMat;
      place.meshes.coinMesh?.forEach(coin => coin.material = this.transparentMat);
    });
  }

}
