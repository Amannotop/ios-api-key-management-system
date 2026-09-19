import crypto from 'crypto';
import prisma from '../prisma';

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, any>;
}

class WebhookService {
  private clients: Map<string, any> = new Map();

  async send(event: string, data: Record<string, any>): Promise<void> {
    try {
      const webhooks = await prisma.webhook.findMany({
        where: { active: true },
      });

      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      await Promise.all(
        webhooks.map((webhook: any) => this.deliverWebhook(webhook, payload))
      );
    } catch (error) {
      console.error('Webhook send error:', error);
    }
  }

  private async deliverWebhook(webhook: any, payload: WebhookPayload): Promise<void> {
    try {
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.event,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`Webhook delivery failed for ${webhook.id}: ${response.status}`);
      }
    } catch (error) {
      console.error(`Webhook delivery error for ${webhook.id}:`, error);
    }
  }

  emitToWebSocket(event: string, data: any): void {
    this.clients.forEach((ws: any, id: string) => {
      try {
        ws.send(JSON.stringify({ event, data }));
      } catch {
        this.clients.delete(id);
      }
    });
  }

  addWebSocketClient(ws: any): string {
    const id = crypto.randomUUID();
    this.clients.set(id, ws);
    return id;
  }

  removeWebSocketClient(id: string): void {
    this.clients.delete(id);
  }
}

export const webhookService = new WebhookService();
