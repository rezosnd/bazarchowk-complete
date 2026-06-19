import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
const admin = require('firebase-admin');

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseInitialized = false;

  constructor(private readonly prisma: PrismaService) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      if (!admin.apps.length) {
        // In production, load from proper environment variables or credentials file
        // For safe fallback, we only initialize if the env vars are available
        if (process.env.FIREBASE_PROJECT_ID) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
          });
          this.firebaseInitialized = true;
          this.logger.log('Firebase Admin initialized successfully');
        } else {
          this.logger.warn('Firebase credentials not found. Push notifications will be mocked.');
        }
      } else {
        this.firebaseInitialized = true;
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin', error);
    }
  }

  /**
   * Register a new device token for FCM push notifications
   */
  async registerDeviceToken(userId: string, token: string, deviceOs?: string) {
    return this.prisma.deviceToken.upsert({
      where: { token },
      update: { userId, deviceOs },
      create: { userId, token, deviceOs },
    });
  }

  /**
   * Remove a device token (e.g., on logout)
   */
  async removeDeviceToken(token: string) {
    try {
      await this.prisma.deviceToken.delete({ where: { token } });
    } catch (e) {
      // Ignore if not found
    }
  }

  /**
   * Sends both an In-App database notification and an FCM Push Notification
   */
  async sendInAppNotification(userId: string, title: string, message: string, type: string = 'SYSTEM') {
    // 1. Save to Database for In-App Feed
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    });

    // 2. Trigger FCM Push Notification asynchronously
    this.sendPushNotification(userId, title, message).catch(err => {
      this.logger.error(`Failed to send push notification to user \${userId}`, err);
    });

    return notification;
  }

  private async sendPushNotification(userId: string, title: string, body: string) {
    if (!this.firebaseInitialized) {
      this.logger.log(`[MOCK PUSH] To: \${userId} | Title: \${title} | Body: \${body}`);
      return;
    }

    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });

    if (tokens.length === 0) return;

    const messages = tokens.map(t => ({
      notification: { title, body },
      token: t.token,
    }));

    try {
      const response = await admin.messaging().sendEach(messages);
      this.logger.log(`FCM Push sent. Success: \${response.successCount}, Failures: \${response.failureCount}`);

      // Optionally cleanup failed tokens (e.g., Unregistered)
      response.responses.forEach((res: any, idx: number) => {
        if (!res.success && res.error?.code === 'messaging/registration-token-not-registered') {
          this.removeDeviceToken(tokens[idx].token);
        }
      });
    } catch (error) {
      this.logger.error('Error sending FCM push', error);
    }
  }

  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
