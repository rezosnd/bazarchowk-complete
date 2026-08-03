import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseInitialized = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      if (!getApps().length) {
        // In production, load from proper environment variables or credentials file
        // For safe fallback, we only initialize if the env vars are available
        if (process.env.FIREBASE_PROJECT_ID) {
          initializeApp({
            credential: cert({
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

    // Broadcast instantly over websockets
    this.realtimeGateway.sendToUser(userId, 'new_notification', notification);

    // 2. Trigger FCM Push Notification asynchronously
    this.sendPushNotification(userId, title, message).catch(err => {
      this.logger.error(`Failed to send push notification to user ${userId}`, err);
    });

    return notification;
  }

  private async sendPushNotification(userId: string, title: string, body: string) {
    if (!this.firebaseInitialized) {
      this.logger.log(`[MOCK PUSH] To: ${userId} | Title: ${title} | Body: ${body}`);
      return;
    }

    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });

    const expoTokens = tokens.filter(t => t.token.startsWith('ExponentPushToken') || t.token.startsWith('ExpoPushToken'));
    const fcmTokens = tokens.filter(t => !t.token.startsWith('ExponentPushToken') && !t.token.startsWith('ExpoPushToken'));

    if (expoTokens.length > 0) {
      const expoMessages = expoTokens.map(t => ({
        to: t.token,
        title,
        body,
        sound: 'default'
      }));
      try {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(expoMessages)
        });
        this.logger.log(`Expo Push sent to ${expoTokens.length} devices.`);
      } catch (error) {
        this.logger.error('Error sending Expo push', error);
      }
    }

    if (fcmTokens.length > 0 && this.firebaseInitialized) {
      const messages = fcmTokens.map(t => ({
        notification: { title, body },
        token: t.token,
      }));

      try {
        const response = await getMessaging().sendEach(messages);
        this.logger.log(`FCM Push sent. Success: ${response.successCount}, Failures: ${response.failureCount}`);

        response.responses.forEach((res: any, idx: number) => {
          if (!res.success && res.error?.code === 'messaging/registration-token-not-registered') {
            this.removeDeviceToken(fcmTokens[idx].token);
          }
        });
      } catch (error) {
        this.logger.error('Error sending FCM push', error);
      }
    }
  }

  /**
   * Broadcasts a notification to a specific target audience (Admin capability)
   */
  async sendBroadcastNotification(
    adminId: string,
    targetAudience: 'ALL' | 'CUSTOMER' | 'PARTNER' | 'RIDER',
    title: string,
    message: string,
    imageUrl?: string,
    linkUrl?: string
  ) {
    let userQuery = {};
    if (targetAudience !== 'ALL') {
      userQuery = { role: { name: targetAudience } };
    }

    // 1. Find all matching users with their names for personalization
    const users = await this.prisma.user.findMany({
      where: userQuery,
      select: { id: true, firstName: true, lastName: true }
    });

    if (users.length === 0) return { success: true, count: 0 };

    const parseTemplate = (text: string, user: any) => {
      let parsed = text;
      const firstName = user.firstName || 'User';
      const lastName = user.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      
      parsed = parsed.replace(/{firstName}/gi, firstName);
      parsed = parsed.replace(/{lastName}/gi, lastName);
      parsed = parsed.replace(/{name}/gi, fullName);
      return parsed;
    };

    // 2. Create In-App notifications in bulk (Personalized)
    const notificationData = users.map(user => ({
      userId: user.id,
      title: parseTemplate(title, user),
      message: parseTemplate(message, user),
      type: 'BROADCAST',
      imageUrl: imageUrl || null,
      linkUrl: linkUrl || null,
    }));

    await this.prisma.notification.createMany({
      data: notificationData,
    });

    // 2.5 Broadcast instantly over websockets
    if (targetAudience === 'ALL') {
      this.realtimeGateway.server.emit('new_notification', {
        title,
        message,
        type: 'BROADCAST',
        imageUrl,
        linkUrl,
        createdAt: new Date().toISOString(),
      });
    } else {
      // Broadcast individually since we don't have role-based rooms set up for all targets easily yet
      users.forEach(u => {
        this.realtimeGateway.sendToUser(u.id, 'new_notification', {
          title: parseTemplate(title, u),
          message: parseTemplate(message, u),
          type: 'BROADCAST',
          imageUrl,
          linkUrl,
          createdAt: new Date().toISOString(),
        });
      });
    }

    // 3. Send Push Notifications via FCM (Personalized)
    if (this.firebaseInitialized) {
      const userIds = users.map(u => u.id);
      const tokens = await this.prisma.deviceToken.findMany({
        where: { userId: { in: userIds } },
        select: { token: true, userId: true }
      });

      if (tokens.length > 0) {
        // Send in batches of 500 (FCM limit)
        // Send in batches of 500
        const batchSize = 500;
        for (let i = 0; i < tokens.length; i += batchSize) {
          const batch = tokens.slice(i, i + batchSize);
          
          const expoTokens = batch.filter(t => t.token.startsWith('ExponentPushToken') || t.token.startsWith('ExpoPushToken'));
          const fcmTokens = batch.filter(t => !t.token.startsWith('ExponentPushToken') && !t.token.startsWith('ExpoPushToken'));

          if (expoTokens.length > 0) {
            const expoMessages = expoTokens.map(t => {
              const user = users.find(u => u.id === t.userId);
              const personalizedTitle = user ? parseTemplate(title, user) : title;
              const personalizedMessage = user ? parseTemplate(message, user) : message;
              return {
                to: t.token,
                title: personalizedTitle,
                body: personalizedMessage,
                sound: 'default',
                data: {
                  type: 'BROADCAST',
                  ...(imageUrl ? { imageUrl } : {}),
                  ...(linkUrl ? { linkUrl } : {})
                }
              };
            });
            try {
              await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Accept-encoding': 'gzip, deflate', 'Content-Type': 'application/json' },
                body: JSON.stringify(expoMessages)
              });
              this.logger.log(`Expo Broadcast chunk sent to ${expoTokens.length} devices.`);
            } catch (e) {
              this.logger.error('Failed to send broadcast Expo batch', e);
            }
          }

          if (fcmTokens.length > 0 && this.firebaseInitialized) {
            const messages = fcmTokens.map(t => {
              const user = users.find(u => u.id === t.userId);
              const personalizedTitle = user ? parseTemplate(title, user) : title;
              const personalizedMessage = user ? parseTemplate(message, user) : message;

              return {
                notification: { 
                  title: personalizedTitle, 
                  body: personalizedMessage,
                  ...(imageUrl ? { imageUrl } : {}) 
                },
                token: t.token,
                data: {
                  type: 'BROADCAST',
                  ...(imageUrl ? { imageUrl } : {}),
                  ...(linkUrl ? { linkUrl } : {})
                }
              };
            });

            try {
              const response = await getMessaging().sendEach(messages);
              this.logger.log(`Broadcast chunk sent via FCM. Success: ${response.successCount}, Failures: ${response.failureCount}`);
            } catch (e) {
              this.logger.error('Failed to send broadcast FCM batch', e);
            }
          }
        }
      }
    } else {
      this.logger.log(`[MOCK BROADCAST] To ${users.length} users | Title: ${title}`);
    }

    return { success: true, count: users.length };
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
