// Dashboard screen (homepage if you will)

import React, { useState, useEffect } from 'react';
import { ScrollView, Text, View, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Particles from '../../components/common/ui/starsParticlesBackground';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../../../config';

interface Habit {
  id: string;
  habit_name: string;
  category: string;
  current_streak?: number;
}

interface TodayLog {
  user_id: string;
  completed: boolean;
  logged: boolean;
}

interface HabitTodayStatus {
  habit_id: string;
  habit_name: string;
  user_logs: { [key: string]: TodayLog };
  both_completed: boolean;
}

interface User {
  id: string;
  username: string;
  email: string;
}

interface Partnership {
  id: string;
  partner: {
    username: string;
    email: string;
  };
  current_streak: number;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [todayStatus, setTodayStatus] = useState<HabitTodayStatus[]>([]);
  const [checkedGoals, setCheckedGoals] = useState<string[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      
      if (!token) {
        Alert.alert('Error', 'Please log in again');
        router.replace('/auth/welcome');
        return;
      }

      const baseUrl = await getBaseUrl();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch user info
      const userResponse = await fetch(`${baseUrl}/users/me`, { headers });
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
      }

      // Fetch current partnership
      const partnershipResponse = await fetch(`${baseUrl}/partnerships/current`, { headers });
      if (partnershipResponse.ok) {
        const partnershipData = await partnershipResponse.json();
        setPartnership(partnershipData);

        // Fetch today's status for the partnership
        const todayResponse = await fetch(
          `${baseUrl}/partnerships/${partnershipData.id}/logs/today`,
          { headers }
        );
        if (todayResponse.ok) {
          const todayData = await todayResponse.json();
          setTodayStatus(todayData.habits || []);
        }
      }

      // Fetch habits
      const habitsResponse = await fetch(`${baseUrl}/habits`, { headers });
      if (habitsResponse.ok) {
        const habitsData = await habitsResponse.json();
        setHabits(habitsData);
      }

    } catch (error) {
      console.error('Error loading dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const toggleGoalCheck = async (habitId: string) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const baseUrl = await getBaseUrl();
      
      // Find current status
      const currentStatus = todayStatus.find(h => h.habit_id === habitId);
      const isCurrentlyCompleted = currentStatus?.user_logs[user?.id || '']?.completed || false;

      // Log the habit
      const response = await fetch(`${baseUrl}/habits/${habitId}/log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completed: !isCurrentlyCompleted,
          notes: ''
        })
      });

      if (response.ok) {
        // Refresh today's status
        await loadDashboardData();
      }
    } catch (error) {
      console.error('Error checking in:', error);
      Alert.alert('Error', 'Failed to check in');
    }
  };

  // Get category emoji
  const getCategoryEmoji = (category: string): string => {
    const emojiMap: { [key: string]: string } = {
      'health': '💪',
      'productivity': '📚',
      'mindfulness': '🧘',
      'fitness': '🏃',
      'sleep': '😴',
      'nutrition': '🥗',
      'learning': '📖',
      'social': '👥',
      'creativity': '🎨',
      'finance': '💰',
    };
    return emojiMap[category.toLowerCase()] || '⭐';
  };

  // Calculate streaks from today's status
  const getStreaksForDisplay = () => {
    return todayStatus.slice(0, 4).map(status => ({
      id: status.habit_id,
      name: status.habit_name,
      days: habits.find(h => h.id === status.habit_id)?.current_streak || 0
    }));
  };

  // Get partner progress
  const getPartnerProgress = () => {
    if (!partnership) return [];
    
    return todayStatus
      .filter(status => {
        const partnerUserId = Object.keys(status.user_logs).find(id => id !== user?.id);
        return partnerUserId && status.user_logs[partnerUserId]?.completed;
      })
      .slice(0, 3)
      .map(status => {
        const partnerUserId = Object.keys(status.user_logs).find(id => id !== user?.id);
        return {
          id: status.habit_id,
          partnerName: partnership.partner.username,
          habit: status.habit_name,
          checkedIn: status.user_logs[partnerUserId || '']?.completed || false
        };
      });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Particles />
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  const streaks = getStreaksForDisplay();
  const partnerProgress = getPartnerProgress();

  return (
    <View style={styles.container}>
      <Particles />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.profileIcon}>
            <Ionicons name="person-circle-outline" size={40} color="white" />
          </TouchableOpacity>

          <Text style={styles.greeting}>Hello, {user?.username || 'there'}!</Text>

          <TouchableOpacity style={styles.notificationIcon}>
            <Ionicons name="notifications-outline" size={28} color="white" />
          </TouchableOpacity>
        </View>

        {/* Streaks Section */}
        {streaks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Streaks</Text>
            <View style={styles.streaksContainer}>
              {streaks.map((streak) => (
                <View key={streak.id} style={styles.streakItem}>
                  <Text style={styles.streakName}>{streak.name}</Text>
                  <View style={styles.streakBadge}>
                    <Text style={styles.fireEmoji}>🔥</Text>
                    <Text style={styles.streakDays}>{streak.days}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Check In Section */}
        {habits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Check In</Text>

            <View style={styles.checkInHeader}>
              <Text style={styles.todaysGoalsText}>Today's Goals</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.goalsScroll}
            >
              {habits.slice(0, 5).map((habit) => {
                const status = todayStatus.find(h => h.habit_id === habit.id);
                const isCompleted = status?.user_logs[user?.id || '']?.completed || false;

                return (
                  <TouchableOpacity
                    key={habit.id}
                    style={[
                      styles.goalCard,
                      isCompleted && styles.goalCardCompleted
                    ]}
                    onPress={() => toggleGoalCheck(habit.id)}
                  >
                    <Text style={[
                      styles.goalCardTitle,
                      isCompleted && styles.goalCardTitleCompleted
                    ]}>
                      {habit.habit_name}
                    </Text>
                    <Text style={styles.goalCardIcon}>
                      {getCategoryEmoji(habit.category)}
                    </Text>
                    {isCompleted && (
                      <View style={styles.completedBadge}>
                        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Partner Progress Section */}
        {partnerProgress.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Partner Progress</Text>

            <View style={styles.partnerProgressContainer}>
              {partnerProgress.map((item) => (
                <View key={item.id} style={styles.partnerProgressItem}>
                  <Text style={styles.partnerProgressText}>
                    {item.partnerName} checked in for {item.habit}!
                  </Text>
                  <View style={styles.checkmarkCircle}>
                    <Ionicons name="checkmark" size={20} color="#4CAF50" />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {habits.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No habits yet! Start by creating your first habit.
            </Text>
            <TouchableOpacity style={styles.emptyStateButton}>
              <Text style={styles.emptyStateButtonText}>Create Habit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom spacing for navigation bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={28} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="bar-chart" size={28} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="menu" size={28} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person" size={28} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#291133',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 10,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    marginLeft: 15,
  },
  notificationIcon: {
    padding: 5,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  streaksContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 15,
  },
  streakItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  streakName: {
    fontSize: 16,
    color: 'white',
    flex: 1,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  fireEmoji: {
    fontSize: 18,
  },
  streakDays: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  checkInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  todaysGoalsText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  viewAllText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  goalsScroll: {
    gap: 15,
    paddingRight: 20,
  },
  goalCard: {
    width: 160,
    height: 160,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 20,
    justifyContent: 'space-between',
    position: 'relative',
  },
  goalCardCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  goalCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#291133',
  },
  goalCardTitleCompleted: {
    color: 'white',
  },
  goalCardIcon: {
    fontSize: 48,
    textAlign: 'center',
  },
  completedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  partnerProgressContainer: {
    gap: 10,
  },
  partnerProgressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 16,
    borderRadius: 25,
  },
  partnerProgressText: {
    fontSize: 14,
    color: '#291133',
    flex: 1,
    marginRight: 10,
  },
  checkmarkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 20,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(41, 17, 51, 0.95)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  navItem: {
    padding: 10,
  },
});
