import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import BackwardButton from '@/components/ui/backwardButton';
import PurpleParticles from 'app/components/space/purpleStarsParticlesBackground';
import { BASE_URL } from '../../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationPreferences {
    partner_requests: boolean;
    habit_reminders: boolean;
    nudges: boolean;
    goal_reminders: boolean;
}

interface UserNotificationSettings {
    email_notifications: boolean;
    push_notifications: boolean;
    notification_preferences: NotificationPreferences;
}

export default function NotificationsScreen() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [settings, setSettings] = useState<UserNotificationSettings>({
        email_notifications: true,
        push_notifications: true,
        notification_preferences: {
            partner_requests: true,
            habit_reminders: true,
            nudges: true,
            goal_reminders: true,
        }
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('access_token');
            
            if (!token) {
                Alert.alert('Error', 'Please log in to view notification settings');
                return;
            }

            const response = await fetch(`${BASE_URL}/api/users/me/notifications`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setSettings({
                    email_notifications: data.email_notifications ?? true,
                    push_notifications: data.push_notifications ?? true,
                    notification_preferences: {
                        partner_requests: data.notification_preferences?.partner_requests ?? true,
                        habit_reminders: data.notification_preferences?.habit_reminders ?? true,
                        nudges: data.notification_preferences?.nudges ?? true,
                        goal_reminders: data.notification_preferences?.goal_reminders ?? true,
                    }
                });
            } else {
                console.error('Failed to load notification settings');
            }
        } catch (error) {
            console.error('Error loading notification settings:', error);
            Alert.alert('Error', 'Failed to load notification settings');
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        try {
            setSaving(true);
            const token = await AsyncStorage.getItem('access_token');
            
            if (!token) {
                Alert.alert('Error', 'Please log in to update notification settings');
                return;
            }

            const response = await fetch(`${BASE_URL}/api/users/me/notifications`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings),
            });

            if (response.ok) {
                Alert.alert('Success', 'Notification settings updated');
            } else {
                const error = await response.json();
                Alert.alert('Error', error.detail || 'Failed to update notification settings');
            }
        } catch (error) {
            console.error('Error saving notification settings:', error);
            Alert.alert('Error', 'Failed to save notification settings');
        } finally {
            setSaving(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadSettings();
        setRefreshing(false);
    };

    const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
        setSettings(prev => ({
            ...prev,
            notification_preferences: {
                ...prev.notification_preferences,
                [key]: value,
            }
        }));
    };

    const updateGlobalSetting = (key: 'email_notifications' | 'push_notifications', value: boolean) => {
        setSettings(prev => ({
            ...prev,
            [key]: value,
        }));
    };

    if (loading) {
        return (
            <View className="flex-1 relative" style={{ backgroundColor: '#291133' }}>
                <PurpleParticles />
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#A855F7" />
                    <Text className="text-white/70 mt-4 font-wix">Loading settings...</Text>
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 relative" style={{ backgroundColor: '#291133' }}>
            <PurpleParticles />
            <View className="absolute mt-6 left-8 z-50">
                <BackwardButton />
            </View>
            
            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingTop: 80,
                    paddingBottom: 120,
                    paddingHorizontal: 20,
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#A855F7"
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                <Text className="font-wix text-white text-[36px] text-center mb-8">
                    Notification Settings
                </Text>

                {/* Global Settings */}
                <View className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10">
                    <Text className="font-wix text-white text-xl mb-4">Global Settings</Text>
                    
                    <View className="flex-row justify-between items-center mb-4">
                        <View className="flex-1 mr-4">
                            <Text className="font-wix text-white text-base mb-1">Email Notifications</Text>
                            <Text className="text-white/60 text-sm">Receive notifications via email</Text>
                        </View>
                        <Switch
                            value={settings.email_notifications}
                            onValueChange={(value) => updateGlobalSetting('email_notifications', value)}
                            trackColor={{ false: '#767577', true: '#A855F7' }}
                            thumbColor={settings.email_notifications ? '#fff' : '#f4f3f4'}
                        />
                    </View>

                    <View className="flex-row justify-between items-center">
                        <View className="flex-1 mr-4">
                            <Text className="font-wix text-white text-base mb-1">Push Notifications</Text>
                            <Text className="text-white/60 text-sm">Receive push notifications on your device</Text>
                        </View>
                        <Switch
                            value={settings.push_notifications}
                            onValueChange={(value) => updateGlobalSetting('push_notifications', value)}
                            trackColor={{ false: '#767577', true: '#A855F7' }}
                            thumbColor={settings.push_notifications ? '#fff' : '#f4f3f4'}
                        />
                    </View>
                </View>

                {/* Notification Types */}
                <View className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10">
                    <Text className="font-wix text-white text-xl mb-4">Notification Types</Text>
                    
                    <View className="flex-row justify-between items-center mb-4">
                        <View className="flex-1 mr-4">
                            <Text className="font-wix text-white text-base mb-1">Partner Requests</Text>
                            <Text className="text-white/60 text-sm">Notifications when someone sends you a partnership request</Text>
                        </View>
                        <Switch
                            value={settings.notification_preferences.partner_requests}
                            onValueChange={(value) => updatePreference('partner_requests', value)}
                            trackColor={{ false: '#767577', true: '#A855F7' }}
                            thumbColor={settings.notification_preferences.partner_requests ? '#fff' : '#f4f3f4'}
                        />
                    </View>

                    <View className="flex-row justify-between items-center mb-4">
                        <View className="flex-1 mr-4">
                            <Text className="font-wix text-white text-base mb-1">Habit Reminders</Text>
                            <Text className="text-white/60 text-sm">Reminders about your habits and partner check-ins</Text>
                        </View>
                        <Switch
                            value={settings.notification_preferences.habit_reminders}
                            onValueChange={(value) => updatePreference('habit_reminders', value)}
                            trackColor={{ false: '#767577', true: '#A855F7' }}
                            thumbColor={settings.notification_preferences.habit_reminders ? '#fff' : '#f4f3f4'}
                        />
                    </View>

                    <View className="flex-row justify-between items-center mb-4">
                        <View className="flex-1 mr-4">
                            <Text className="font-wix text-white text-base mb-1">Nudges</Text>
                            <Text className="text-white/60 text-sm">Notifications when your partner nudges you</Text>
                        </View>
                        <Switch
                            value={settings.notification_preferences.nudges}
                            onValueChange={(value) => updatePreference('nudges', value)}
                            trackColor={{ false: '#767577', true: '#A855F7' }}
                            thumbColor={settings.notification_preferences.nudges ? '#fff' : '#f4f3f4'}
                        />
                    </View>

                    <View className="flex-row justify-between items-center">
                        <View className="flex-1 mr-4">
                            <Text className="font-wix text-white text-base mb-1">Goal Reminders</Text>
                            <Text className="text-white/60 text-sm">Reminders about your goals and milestones</Text>
                        </View>
                        <Switch
                            value={settings.notification_preferences.goal_reminders}
                            onValueChange={(value) => updatePreference('goal_reminders', value)}
                            trackColor={{ false: '#767577', true: '#A855F7' }}
                            thumbColor={settings.notification_preferences.goal_reminders ? '#fff' : '#f4f3f4'}
                        />
                    </View>
                </View>

                {/* Save Button */}
                <View className="bg-purple-600 rounded-2xl p-4 mb-6">
                    {saving ? (
                        <View className="flex-row items-center justify-center">
                            <ActivityIndicator size="small" color="#fff" />
                            <Text className="text-white font-wix ml-2">Saving...</Text>
                        </View>
                    ) : (
                        <Text
                            onPress={saveSettings}
                            className="text-white font-wix text-center text-lg"
                        >
                            Save Settings
                        </Text>
                    )}
                </View>

                <View className="bg-white/10 rounded-2xl p-4 border border-white/20">
                    <Text className="text-white/70 text-sm text-center font-wix">
                        💡 Tip: Adjust these settings to control which notifications you receive. Changes are saved automatically when you tap "Save Settings".
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}
