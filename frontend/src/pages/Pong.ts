import PgScene from "../tools/games/PgScene";
import { getUser } from "../tools/APIStorageManager";
import { navigate } from "../router";

export default function Pong(): HTMLElement {
  const container = document.createElement('div');
  let UserCurrent = getUser();
  if (!UserCurrent){
    navigate('/');
    return container;
  }
  container.className = 'flex justify-center items-center h-screen bg-black';
  
  const canvas = document.createElement('canvas');
  canvas.className = 'w-full h-full';
  container.appendChild(canvas);

  // Initial size, will be resized for the responsive
  canvas.width = 2032;
  canvas.height = 1016;
  canvas.style.width = canvas.width + "px";
  canvas.style.height = canvas.height + "px";

  const resizeCanvas = () => {
    if (window.innerHeight / window.innerWidth > 0.5) {
      canvas.width = window.innerWidth;
      canvas.height = canvas.width * 0.5;
    } else {
      canvas.height = window.innerHeight;
      canvas.width = canvas.height / 0.5;
    }
    canvas.style.width = canvas.width + "px";
    canvas.style.height = canvas.height + "px";
  };

  const keys: { [key: string]: boolean } = {}; // Send to backend
  
  const handleKeyDown = (e: KeyboardEvent) => {
    keys[e.code] = true;
  };
  const handleKeyUp = (e: KeyboardEvent) => {
    keys[e.code] = false;
  };
  const handleBlur = () => {
    Object.keys(keys).forEach(key => keys[key] = false);
  };
  
  function game() {
    const pgScene = new PgScene(canvas, keys, UserCurrent.name);

    resizeCanvas();
    pgScene.engine.resize();

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("resize", () => pgScene.engine.resize());
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    pgScene.start();

    // Cleanup function
    const cleanup = () => {
      //console.log('[Pong] Cleaning up...');

      // Disconnect WebSocket
      if (pgScene.game) {
        pgScene.game.disconnect();
      }

      // Stop render loop
      pgScene.engine.stopRenderLoop();

      // Remove event listeners
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", cleanup);

      // Dispose engine and scene
      pgScene.scene.dispose();
      pgScene.engine.dispose();

      //console.log('[Pong] Cleanup complete');
    };

    // Register cleanup function for router
    (window as any).__pongDisconnect = cleanup;

    // Handle browser close/refresh
    window.addEventListener("beforeunload", cleanup);
  }

  game();

  return container;
};