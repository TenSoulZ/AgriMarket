class NativeWebSocketWrapper {
  private url: string;
  private ws: WebSocket | null = null;
  private listeners: Record<string, Function[]> = {};

  constructor(conversationId: string) {
    if (typeof window === 'undefined') {
      this.url = '';
      return;
    }
    const token = localStorage.getItem('access_token') || '';
    let baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8000';
    // Normalize url from http/https to ws/wss
    baseUrl = baseUrl.replace(/^http/, 'ws');
    this.url = `${baseUrl}/ws/chat/${conversationId}/?token=${token}`;
  }

  connect() {
    if (typeof window === 'undefined' || !this.url) return;
    
    if (this.ws) {
      this.ws.close();
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('Daphne WebSocket Connected');
        this.trigger('connect');
      };

      this.ws.onclose = () => {
        console.log('Daphne WebSocket Disconnected');
        this.trigger('disconnect');
      };

      this.ws.onerror = (err) => {
        console.error('Daphne WebSocket Error:', err);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.trigger('receive_message', data);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };
    } catch (err) {
      console.error('Error starting WebSocket connection:', err);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: string, data: any) {
    if (event === 'send_message' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        text: data.text
      }));
    }
  }

  private trigger(event: string, payload?: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(payload));
    }
  }
}

let socketInstance: NativeWebSocketWrapper | null = null;
let currentConversationId: string | null = null;

export const getSocket = (conversationId?: string): any => {
  if (typeof window === 'undefined') {
    return {} as any;
  }
  
  if (!conversationId) {
    return socketInstance || ({} as any);
  }

  if (!socketInstance || currentConversationId !== conversationId) {
    if (socketInstance) {
      socketInstance.disconnect();
    }
    socketInstance = new NativeWebSocketWrapper(conversationId);
    currentConversationId = conversationId;
  }
  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    currentConversationId = null;
  }
};
