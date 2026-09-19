import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { webhookService } from '../services/webhookService';

let wss: WebSocketServer;

export function setupWebSocket(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    const clientId = webhookService.addWebSocketClient(ws);
    console.log(`WebSocket client connected: ${clientId}`);

    ws.on('close', () => {
      webhookService.removeWebSocketClient(clientId);
      console.log(`WebSocket client disconnected: ${clientId}`);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      webhookService.removeWebSocketClient(clientId);
    });

    ws.send(JSON.stringify({ 
      event: 'connected', 
      data: { clientId } 
    }));
  });

  return wss;
}

export function broadcastEvent(event: string, data: any): void {
  webhookService.emitToWebSocket(event, data);
}

export { wss };
