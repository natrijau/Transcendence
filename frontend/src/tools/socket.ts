// tools/network/socket.ts

class SocketManager {
  private ws: WebSocket | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimeout: number | null = null;

  connect(url: string = 'wss://localhost/blackjack'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          //console.log('✅ WebSocket connected to', url);
          this.reconnectAttempts = 0;
          this.trigger('connect', {});
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const { event: eventName, data } = JSON.parse(event.data);
            //console.log('📨 Received:', eventName, data);
            this.trigger(eventName, data);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.trigger('error', error);
        };

        this.ws.onclose = () => {
          //console.log('🔌 WebSocket disconnected');
          this.trigger('disconnect', {});
          this.attemptReconnect(url);
        };
      } catch (error) {
        console.error('Connection error:', error);
        reject(error);
      }
    });
  }

  private attemptReconnect(url: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      
      //console.log(`🔄 Reconnecting in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      this.reconnectTimeout = window.setTimeout(() => {
        this.connect(url).catch(() => {
        });
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.trigger('reconnectFailed', {});
    }
  }

  emit(event: string, data?: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ event, data });
      //console.log('📤 Sending:', event, data);
      this.ws.send(message);
    } else {
      console.error('❌ Cannot send, WebSocket not connected (state:', this.ws?.readyState, ')');
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
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in handler for ${event}:`, error);
        }
      });
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.eventHandlers.clear();
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const socket = new SocketManager();