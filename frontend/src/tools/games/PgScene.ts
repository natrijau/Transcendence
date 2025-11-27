import { Engine, Scene, FreeCamera,
  Vector3, Color3, GlowLayer, Mesh,
  StandardMaterial, MeshBuilder,
  ParticleSystem, Texture,
} from "@babylonjs/core";
import Victor from "victor";
import PgGui from "./PgGui";
import "./PgClient";
import GameConnection from "./PgClient";

export default class PgScene {
  hostPlayer: string;
  canvas: HTMLCanvasElement;
  engine: Engine;
  scene: Scene;
  gui: PgGui;
  game: GameConnection;
  gameStarted: boolean = false;
  gameMode: { type: string, aiMode1?: string, aiMode2?: string } | null = null;
  gameStartTime: number = 2000; // ms
  camera: FreeCamera;
  
  cinematicPosition = new Vector3(0, -20, 0);
  cinematicTarget = new Vector3(0, -25, 0);
  cameraPositionTop = new Vector3(0, 28, 0);
  cameraTargetTop = new Vector3(0, 0, 0);

  keys: { [key: string]: boolean };

  width: number = 30;
  height: number = 20;
  speed: number = 0.02;

  green3: Color3;
  purple3: Color3;

  objects: { [object: string]: {
    mesh: Mesh;
    position: Victor;
    size?: number;
    width?: number;
    height?: number;
    depth?: number;
  } } = {};

  particles: { [particle: string]: ParticleSystem } = {};

  constructor(canvas: HTMLCanvasElement, keys: { [key: string]: boolean }, hostPlayer: string) {
    this.canvas = canvas;
    this.keys = keys;
    this.hostPlayer = hostPlayer;
    this.engine = new Engine(canvas, true);
    // remove selection thikness on engine
    this.engine.getRenderingCanvas()?.style.setProperty("outline", "none");
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color3(0.035, 0.02, 0.05).toColor4(); // Couleur de fond

    const cameraRotationTop = new Vector3(Math.PI * 2, Math.PI * 2, 0);
    // // vue de côté (remote)
    // const cameraPositionSide = new Vector3(width / 1.3, 15, 0);
    // const cameraTargetSide = new Vector3(0, -5, 0);
    // vue de face (watch)
    // const cameraPositionFront = new Vector3(0, 20, 15);
    // const cameraTargetFront = new Vector3(0, 0, 2);

    // Camera
    this.camera = new FreeCamera("camera", this.cinematicPosition, this.scene);
    this.camera.setTarget(this.cinematicTarget);
    this.camera.rotation = cameraRotationTop;
    // this.camera.attachControl(canvas, true);

    // Glow layer
    const gl = new GlowLayer("glow", this.scene);
    gl.intensity = 2;

    this.green3 = new Color3(0, 0.8, 0);
    this.purple3 = new Color3(0.35, 0, 0.5);

    this.initObjects();
    this.initParticles();

    this.gui = new PgGui(this.hostPlayer);

    this.game = new GameConnection(
      {
        update: async (data: { positions: { ball: Victor; paddleLeft: Victor; paddleRight: Victor },
          speed: number, scores?: { left: number; right: number }, ballDirection?: Victor }) => {
          this.updateBallPosition(data.positions.ball);
          this.updatePaddlePosition("left", data.positions.paddleLeft);
          this.updatePaddlePosition("right", data.positions.paddleRight);
          this.gui.panel.speed.update(data.speed);
          if (data.scores) {
            this.gui.score.update("left", data.scores.left);
            this.gui.score.update("right", data.scores.right);
          }
          if (data.ballDirection)
            this.triggerCollisionEffect(new Vector3(data.ballDirection.x, 0, data.ballDirection.y));
        },
        showResult: async (data: { left: number, right: number }) => {
          this.gameStarted = false;
          this.gameStartTime = 2000;
          this.gui.score.update("left", data.left);
          this.gui.score.update("right", data.right);
          this.gui.result.show();
        },
        restart: async (data: { type: string; aiMode1?: string | undefined; aiMode2?: string | undefined; }) => {
          this.gameMode = data;
          this.gui.startedType = this.gameMode;
        }
      },
      {
        "boundUp": { position: this.objects["boundUp"].position,
          width: this.objects["boundUp"].width!, height: this.objects["boundUp"].height! },
        "boundDown": { position: this.objects["boundDown"].position,
          width: this.objects["boundDown"].width!, height: this.objects["boundDown"].height! },
      }
    );

    this.game.connect();

    this.render();
  }

  // Offset positions to match the 3D scene
  boxMeshOffset = new Vector3(-this.width / 2, 0.5, -this.height / 2);

  private boxObjectOffsetfrom2D( obj2D: { position: Victor, width?: number, height?: number, size?: number} ): Vector3 {
    return new Vector3(
      obj2D.position.x + (obj2D.width ? obj2D.width : 0) / 2 + this.boxMeshOffset.x,
      0.5,
      obj2D.position.y + (obj2D.height ? obj2D.height : 0) / 2 + this.boxMeshOffset.z
    );
  }

  private initObjects() {
    // Balle
    const ball = {
      size: 0.25,
      position: new Victor(0, 0),
    };
    const ballMat = new StandardMaterial("ballMat", this.scene);
    ballMat.diffuseColor = this.green3;
    ballMat.emissiveColor = this.green3;
    const ball3D = MeshBuilder.CreateSphere("ball3D", { diameter: ball.size * 2 }, this.scene);
    ball3D.material = ballMat;
    ball3D.position.set(this.width, 0.5, this.height); // Out of view
    this.objects["ball"] = { mesh: ball3D, ...ball };

    // Raquettes
    const paddleMat = new StandardMaterial("paddleMat", this.scene);
    paddleMat.diffuseColor = this.purple3;
    paddleMat.emissiveColor = this.purple3;

    const paddleLeft = {
      position: new Victor(0.3, this.height / 2 - 1.5),
      width: 0.3,
      height: 3,
    };
    const paddleLeft3D = MeshBuilder.CreateBox("paddleLeft3D", {
      height: paddleLeft.width, width: 0.3, depth: paddleLeft.height
    }, this.scene);
    paddleLeft3D.material = paddleMat;
    paddleLeft3D.position = this.boxObjectOffsetfrom2D(paddleLeft);
    this.objects["paddleLeft"] = { mesh: paddleLeft3D, ...paddleLeft };

    const paddleRight = {
      position: new Victor(this.width - 0.75, this.height / 2 - 1.5),
      width: 0.3,
      height: 3,
    };
    const paddleRight3D = MeshBuilder.CreateBox("paddleRight3D", {
      height: paddleRight.width, width: 0.3, depth: paddleRight.height
    }, this.scene);
    paddleRight3D.material = paddleMat;
    paddleRight3D.position = this.boxObjectOffsetfrom2D(paddleRight);
    this.objects["paddleRight"] = { mesh: paddleRight3D, ...paddleRight };

    // Bords
    const boundColor = new Color3(0.2, 0.2, 0.2);
    const boundMat = new StandardMaterial("boundMat", this.scene);
    boundMat.diffuseColor = boundColor;
    boundMat.emissiveColor = boundColor;

    const boundUp = {
      height: 0.2,
      width: this.width - 2,
      position: new Victor(this.width / 2 - (this.width - 2) / 2, 0.1)
    };
    const boundUp3D = MeshBuilder.CreateBox("boundUp", {
      height: boundUp.height, width: boundUp.width, depth: 0.2
    }, this.scene);
    boundUp3D.material = boundMat;
    boundUp3D.position = this.boxObjectOffsetfrom2D(boundUp);
    this.objects["boundUp"] = { mesh: boundUp3D, ...boundUp};

    const boundDown = {
      height: 0.2,
      width: this.width - 2,
      position: new Victor(this.width / 2 - (this.width - 2) / 2, this.height - 0.1)
    };
    const boundDown3D = MeshBuilder.CreateBox("boundDown", {
      height: boundDown.height, width: boundDown.width, depth: 0.2
    }, this.scene);
    boundDown3D.material = boundMat;
    boundDown3D.position = this.boxObjectOffsetfrom2D(boundDown);
    this.objects["boundDown"] = { mesh: boundDown3D, ...boundDown};
  }
    
  private initParticles() {
    // urlTexture
    const urlTexture = "https://playground.babylonjs.com/textures/flare.png";

    // Particles pour la balle
    const ball = new ParticleSystem("ball", 500, this.scene);
    ball.particleTexture = new Texture(urlTexture, this.scene);
    ball.emitter = this.objects["ball"].mesh;
    ball.minEmitBox = new Vector3(0, 0, 0);
    ball.maxEmitBox = new Vector3(0, 0, 0);
    ball.color1 = this.green3.toColor4(1);
    ball.minLifeTime = this.speed * 10;
    ball.maxLifeTime = this.speed * 10;
    ball.emitRate = 500;
    ball.addSizeGradient(0, 1);
    ball.addSizeGradient(1, 0.5);
    ball.start();
    this.particles["ball"] = ball;

    // Particles pour le font
    const font = new ParticleSystem("font",5000, this.scene);
    font.particleTexture = new Texture(urlTexture, this.scene);
    font.emitter = new Vector3(0, -25, 0);
    font.minEmitBox = new Vector3(0, 0, 0);
    font.maxEmitBox = new Vector3(0, 0, 0);
    font.minEmitPower = this.speed * 200;
    font.maxEmitPower = this.speed * 500;
    font.direction1 = new Vector3(-1, 1, -1);
    font.direction2 = new Vector3(1, 1, 1);
    font.color1 = this.purple3.toColor4(1);
    font.addColorGradient(0, Color3.Black().toColor4());
    font.addColorGradient(0.2, new Color3(0.7, 0, 1).toColor4(), Color3.White().toColor4());
    font.minSize = 0.03;
    font.maxSize = 0.03;
    font.minLifeTime = 10;
    font.maxLifeTime = 10;
    font.emitRate = 300;
    font.start();
    this.particles["font"] = font;

    // Particules pour les collisions
    const collision = new ParticleSystem("collision",3000, this.scene);
    collision.particleTexture = new Texture(urlTexture, this.scene);
    collision.emitter = this.objects["ball"].mesh;
    collision.minEmitBox = new Vector3(0, 0, 0);
    collision.maxEmitBox = new Vector3(0, 0, 0);
    collision.minEmitPower = this.speed * 400;
    collision.maxEmitPower = this.speed * 1000;
    collision.color1 = this.green3.toColor4();
    // collision.colorDead = new Color3(0, 0, 0).toColor4();
    collision.minSize = 0.1;
    collision.maxSize = 0.1;
    collision.minLifeTime = this.speed * 50;
    collision.maxLifeTime = this.speed * 100;
    collision.manualEmitCount = 0;
    collision.disposeOnStop = false;
    collision.start();
    this.particles["collision"] = collision;
  }

  triggerCollisionEffect(direction: Vector3) {
    this.particles["collision"].direction1 = new Vector3(-0.5, 0.5, -0.5);
    this.particles["collision"].direction2 = new Vector3(0.5, -0.5, 0.5);
    this.particles["collision"].direction1.addInPlace(direction);
    this.particles["collision"].direction2.addInPlace(direction);
    this.particles["collision"].manualEmitCount = 100; // nombre de particules par collision
    this.particles["collision"].start();
  }

  render() {
    let cinematicEndUp = false;
    let cinematicElapsedTime = 0;
    const cinematicDuration = 3000; // Durée de la cinématique en ms

    const initFontParticlesMinSize = this.particles["font"].minSize;
    const initFontParticlesMaxSize = this.particles["font"].maxSize;

    this.scene.onBeforeRenderObservable.add(() => {
      const deltaTime = this.engine.getDeltaTime(); // en millisecondes

      // Cinematic
      this.gameMode = this.gui.isStarted();
      if (!this.gameMode)
        return;
      if (this.gameMode.type === "ended") {
        //console.log("Game ended, stopping scene updates. with gameMode :", this.gameMode);
        this.game.send({ type: 'ended' });
        this.gui.startedType = null;
        this.gui.started = false;
        return;
      }

      if (!cinematicEndUp) {
        cinematicElapsedTime += deltaTime;
        const t = Math.min(cinematicElapsedTime / cinematicDuration, 1); // progression de 0 à 1
        this.camera.position.copyFrom(Vector3.Lerp(this.camera.position, this.cameraPositionTop, t / 20));
        this.camera.setTarget(Vector3.Lerp(this.camera.getTarget(), this.cameraTargetTop, t / 20));
        this.particles.font.minSize = initFontParticlesMinSize + t * 0.1;
        this.particles.font.maxSize = initFontParticlesMaxSize + t * 0.1;
        if (cinematicElapsedTime >= cinematicDuration) {
          cinematicEndUp = true;
          this.gui.score.visibility(true);
        }
        return;
      }
      this.game.send({ type: 'input', data: this.keys });
      if (!this.gameStarted) { //! must add a gui count from 3 to 0
        this.gameStartTime -= deltaTime;
        if (this.gameStartTime <= 0) {
          this.gameStarted = true;
          this.game.send({ type: 'start', data: this.gameMode });
        }
        return;
      }

      // Escape or Space to pause
      if (this.keys["Escape"] || this.keys["Space"]) {
        if (!this.gui.pause.isPaused()) {
          this.gui.pause.visibility(true);
          this.game.send({ type: 'pause' });
        } else {
          this.gui.pause.visibility(false);
          this.game.send({ type: 'resume' });
        }
        this.keys["Escape"] = false;
        this.keys["Space"] = false;
      }

      if (!this.gui.pause.isPaused()) {
        this.game.send({ type: 'resume' });
      }
    });
  }

  updateBallPosition(position: { x: number, y: number }) {
    this.objects["ball"].position.x = position.x;
    this.objects["ball"].position.y = position.y;
    this.objects["ball"].mesh.position.copyFrom(this.boxObjectOffsetfrom2D(this.objects["ball"]));
  }

  updatePaddlePosition(side: "left" | "right", position: { x: number, y: number }) {
    const paddleKey = side === "left" ? "paddleLeft" : "paddleRight";
    this.objects[paddleKey].position.x = position.x;
    this.objects[paddleKey].position.y = position.y;
    this.objects[paddleKey].mesh.position.copyFrom(this.boxObjectOffsetfrom2D(this.objects[paddleKey]));
  }

  start() {
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }
}