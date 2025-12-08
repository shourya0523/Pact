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

  async scheduleWeeklyReminder(
    habitName: string,
    weekday: number = 1, // 1 = Monday, 7 = Sunday
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
        weekday,
        hour,
        minute,
        repeats: true,
      },
    });
  }

  async scheduleMonthlyReminder(
    habitName: string,
    day: number = 1, // Day of month (1-31)
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
        day,
        hour,
        minute,
        repeats: true,
      },
    });
  }

  async scheduleHabitReminder(
    habitName: string,
    frequency: 'daily' | 'weekly' | 'monthly',
    hour: number = 9,
    minute: number = 0
  ): Promise<string> {
    switch (frequency) {
      case 'daily':
        return await this.scheduleDailyReminder(habitName, hour, minute);
      case 'weekly':
        // Default to Monday for weekly
        return await this.scheduleWeeklyReminder(habitName, 1, hour, minute);
      case 'monthly':
        // Default to 1st of month for monthly
        return await this.scheduleMonthlyReminder(habitName, 1, hour, minute);
      default:
        return await this.scheduleDailyReminder(habitName, hour, minute);
    }
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