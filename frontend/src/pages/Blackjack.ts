import BjScene from '../tools/games/BjScene';
import { connect as BjConnect } from '../tools/games/BjRequest';
import { getUser } from '../tools/APIStorageManager';
import { navigate } from '../router';

export default function Blackjack(): HTMLElement {
  const container = document.createElement('div');
  let UserCurrent = getUser();
  if (!UserCurrent){
    navigate('/');
    return container;
  }
  container.className = 'flex justify-center items-center h-screen bg-[#09050d]';

  const canvas = document.createElement('canvas');
  canvas.className = 'block fixed w-full h-full';
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

  async function game() {
    const bjScene = new BjScene(canvas);

    resizeCanvas();
    bjScene.engine.resize();

    const handleResize = () => {
      resizeCanvas();
      bjScene.engine.resize();
    };

    window.addEventListener("resize", handleResize);

    // Le gameId sera généré par le backend lors du join
    const gameId = `game_${Date.now()}`;
    const playerId = `player_${Date.now()}`;
    (window as any).BJ_GAME_ID = gameId;
    (window as any).BJ_PLAYER_ID = playerId;

    try {
      await BjConnect({
        gameId,
        playerId,
        playerName: 'Player',
        bank: 0,
        position: 'p1'
      });
    } catch (e) {
      console.error('[Blackjack] Connection backend échouée:', e);
    }

    bjScene.start();

    // Cleanup function
    const cleanup = () => {
      //console.log('[Blackjack] Cleaning up...');

      // Stop render loop
      bjScene.engine.stopRenderLoop();

      // Remove event listeners
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("beforeunload", cleanup);

      // Dispose engine and scene
      bjScene.scene.dispose();
      bjScene.engine.dispose();

      //console.log('[Blackjack] Cleanup complete');
    };

    // Store the previous __bjDisconnect if it exists
    const previousBjDisconnect = (window as any).__bjDisconnect;

    // Override __bjDisconnect to include cleanup
    (window as any).__bjDisconnect = () => {
      // Call previous disconnect if it exists (for WebSocket cleanup)
      if (previousBjDisconnect && typeof previousBjDisconnect === 'function') {
        try {
          previousBjDisconnect();
        } catch (e) {
          console.error('[Blackjack] Error in WebSocket disconnect:', e);
        }
      }
      // Then cleanup the scene
      cleanup();
    };

    // Handle browser close/refresh
    window.addEventListener("beforeunload", cleanup);
  }

  game();

  return container;
}