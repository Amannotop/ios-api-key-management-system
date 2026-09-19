interface NotificationPayload {
  type: 'email' | 'sms';
  to: string;
  subject?: string;
  message: string;
}

class NotificationService {
  private emailProvider: 'console' | 'smtp' | 'sendgrid' = 'console';
  private smsProvider: 'console' | 'twilio' = 'console';

  constructor() {
    this.emailProvider = (process.env.EMAIL_PROVIDER as any) || 'console';
    this.smsProvider = (process.env.SMS_PROVIDER as any) || 'console';
  }

  async sendEmail(to: string, subject: string, message: string): Promise<void> {
    if (this.emailProvider === 'console') {
      console.log(`[EMAIL] To: ${to}, Subject: ${subject}, Message: ${message}`);
      return;
    }

    if (this.emailProvider === 'smtp') {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@licensekeyserver.com',
        to,
        subject,
        text: message,
        html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
      });
      return;
    }

    if (this.emailProvider === 'sendgrid') {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      await sgMail.send({
        to,
        from: process.env.EMAIL_FROM || 'noreply@licensekeyserver.com',
        subject,
        text: message,
        html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
      });
    }
  }

  async sendSMS(to: string, message: string): Promise<void> {
    if (this.smsProvider === 'console') {
      console.log(`[SMS] To: ${to}, Message: ${message}`);
      return;
    }

    if (this.smsProvider === 'twilio') {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      });
    }
  }

  async send(payload: NotificationPayload): Promise<void> {
    if (payload.type === 'email') {
      await this.sendEmail(payload.to, payload.subject || '', payload.message);
    } else {
      await this.sendSMS(payload.to, payload.message);
    }
  }

  async notifyKeyExpiry(keyValue: string, expiresAt: Date): Promise<void> {
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    const message = `License key ${keyValue} will expire in ${daysUntilExpiry} days on ${expiresAt.toLocaleDateString()}.`;
    
    if (process.env.NOTIFY_EMAIL) {
      await this.sendEmail(process.env.NOTIFY_EMAIL, 'License Key Expiring Soon', message);
    }
    
    if (process.env.NOTIFY_SMS) {
      await this.sendSMS(process.env.NOTIFY_SMS, message);
    }
  }

  async notifySuspiciousActivity(key: string, ip: string, reason: string): Promise<void> {
    const message = `Suspicious activity detected:\nKey: ${key}\nIP: ${ip}\nReason: ${reason}`;
    
    if (process.env.NOTIFY_EMAIL) {
      await this.sendEmail(process.env.NOTIFY_EMAIL, 'Suspicious Activity Alert', message);
    }
    
    if (process.env.NOTIFY_SMS) {
      await this.sendSMS(process.env.NOTIFY_SMS, 'Suspicious activity detected on license key');
    }
  }
}

export const notificationService = new NotificationService();
