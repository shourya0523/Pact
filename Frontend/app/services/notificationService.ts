import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
})

class NotificationService {
  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('⚠️ Notifications only work on physical devices');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Notification permissions denied');
      return false;
    }

    console.log('✅ Notification permissions granted');
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Pact Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#9A84A2',
      });
    }

    return true;
  }

  async sendNotification(title: string, body: string): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, 
    });
  }

  async scheduleNotification(
    title: string,
    body: string,
    seconds: number
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: { seconds },
    });
  }

  async scheduleDailyReminder(
    habitName: string,
    hour: number = 9,
    minute: number = 0
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Habit Reminder',
        body: `Time to complete "${habitName}"!`,
        sound: true,
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });
  }

  async cancelNotification(id: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(id);
  }

  async getScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export const notificationService = new NotificationService();