// tools/network/socket.ts

class SocketManager {
  private ws: WebSocket | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(url: string = 'ws://localhost:3000/blackjack'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          //console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.trigger('connect', {});
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const { event: eventName, data } = JSON.parse(event.data);
            this.trigger(eventName, data);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.trigger('error', error);
          reject(error);
        };

        this.ws.onclose = () => {
          //console.log('🔌 WebSocket disconnected');
          this.trigger('disconnect', {});
          this.attemptReconnect(url);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect(url: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      //console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect(url).catch(() => {
          // L'erreur sera gérée par la récursion
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
      this.trigger('reconnectFailed', {});
    }
  }

  emit(event: string, data?: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    } else {
      console.error('WebSocket not connected');
    }
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler?: Function) {
    if (!handler) {
      this.eventHandlers.delete(event);
    } else {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    }
  }

  private trigger(event: string, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.eventHandlers.clear();
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const socket = new SocketManager();