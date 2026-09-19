import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../prisma';
import { webhookService } from '../services/webhookService';

const router = Router();

router.post('/', async (req, res) => {
  const { url, events, secret } = req.body;

  if (!url) {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  try {
    const webhookSecret = secret || crypto.randomBytes(32).toString('hex');
    
    const webhook = await prisma.webhook.create({
      data: {
        url,
        events: events || ['key_created', 'key_expired', 'key_banned'],
        secret: webhookSecret,
      },
    });

    res.status(201).json({ 
      id: webhook.id, 
      secret: webhookSecret,
      message: 'Store the secret securely. It will not be shown again.' 
    });
  } catch (error) {
    console.error('Webhook create error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const webhooks = await prisma.webhook.findMany({
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        createdAt: true,
      },
    });
    res.json(webhooks);
  } catch (error) {
    console.error('Webhook list error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { events, active } = req.body;

  try {
    const webhook = await prisma.webhook.update({
      where: { id },
      data: {
        ...(events && { events }),
        ...(typeof active === 'boolean' && { active }),
      },
    });
    res.json(webhook);
  } catch (error) {
    console.error('Webhook update error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.webhook.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Webhook delete error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/test/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }

    await webhookService.send('test', { message: 'This is a test webhook' });
    res.json({ success: true });
  } catch (error) {
    console.error('Webhook test error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
