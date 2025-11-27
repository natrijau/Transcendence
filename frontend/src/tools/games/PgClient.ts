// wss client for Pong
export default class GameConnection {

  ws: WebSocket | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  shouldReconnect: boolean;

  functions: any;
  beginData: any;

  constructor(functions: any, beginData: any) {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.shouldReconnect = true;

    this.functions = functions;
    this.beginData = beginData;
  }
  
  connect() {
    this.ws = new WebSocket(`/api/pong`);
    
    this.ws.onopen = () => {
      //console.log('Connected to game server');
      this.reconnectAttempts = 0;
      this.sendReady();
    };
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.ws.onclose = (event) => {
      //console.log('Disconnected from game server');

      // Reconnexion automatique seulement si non intentionnel
      if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => {
          //console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          this.connect();
        }, 1000 * this.reconnectAttempts);
      }
    };
  }
  
  sendReady() {
    this.send({ type: 'ready', data: this.beginData });
  }
  
  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
  
  handleMessage(message: any) {
    switch (message.type) {
      case 'update':
        this.functions.update(message.data);
        break;
      case 'result':
        this.functions.showResult(message.data);
        break;
      case 'error':
        console.error('Server error:', message.error);
        break;
    }
  }

  disconnect() {
    //console.log('[PgClient] Disconnecting WebSocket...');
    this.shouldReconnect = false;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, 'Page navigation');
    }

    this.ws = null;
  }
}