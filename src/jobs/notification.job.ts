import type { FastifyInstance } from 'fastify';
import type { JobPayload } from './queue';

export interface NotificationPayload {
  userId: string;
  channel: 'email' | 'webhook';
  message: string;
  transactionId?: string;
}

export class NotificationJob {
  constructor(private app: FastifyInstance) {}

  async send(payload: NotificationPayload): Promise<void> {
    const { userId, channel, message, transactionId } = payload;
    
    this.app.log.info(
      { userId, channel, transactionId },
      'Processing notification job',
    );

    try {
      // Simulate async delivery (replace with real email/webhook service)
      switch (channel) {
        case 'email':
          await this.sendEmail(userId, message);
          break;
        case 'webhook':
          await this.sendWebhook(message);
          break;
      }

      this.app.log.info({ userId, channel }, 'Notification sent successfully');
    } catch (error) {
      this.app.log.error({ error, userId, channel }, 'Notification failed');
      
      // Mark for retry (simple counter-based retry)
      const retryKey = `notification:retry:${userId}:${channel}:${transactionId || 'no-tx'}`;
      const retryCount = await this.app.redis.get(retryKey);
      
      const count = retryCount ? parseInt(retryCount) + 1 : 1;
      
      if (count <= 3) {
        // Re-queue with exponential backoff (seconds)
        const backoff = Math.pow(2, count);
        await this.app.redis.setEx(retryKey, 3600, count.toString());
        
        // Re-queue job
        const job: JobPayload = {
          type: 'notification',
          payload: {
            userId,
            channel,
            message,
            transactionId,
          },
        };
        await this.app.redis.lPush('jobs:retry', JSON.stringify(job));
        this.app.log.warn({ userId, channel, retry: count, backoff }, 'Notification re-queued');
      } else {
        this.app.log.error({ userId, channel }, 'Notification failed permanently after 3 retries');
        // Could store in dead letter queue: await app.redis.lPush('jobs:dead', JSON.stringify(job));
      }
    }
  }

  pri
