// Dashboard screen (homepage if you will)

import React, { useState } from 'react';
import { ScrollView, Text, View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Particles from '../../components/common/ui/starsParticlesBackground';
import { Ionicons } from '@expo/vector-icons';

// placeholder - replace with actual user data
const userName = "Mark";
const streaks = [
  { id: '1', name: 'Study Everyday', days: 4 },
  { id: '2', name: 'Reduce Screen Time', days: 13 },
  { id: '3', name: 'Workout', days: 1 },
  { id: '4', name: 'Wake Up Early', days: 7 },
];

const todaysGoals = [
  { id: '1', name: 'Wake Up Early', icon: '☀️' },
  { id: '2', name: 'Study Everyday', icon: '📚' },
  { id: '3', name: 'Workout', icon: '💪' },
];

const partnerProgress = [
  { id: '1', partnerName: 'Jake', habit: 'Study Everyday', checkedIn: true },
  { id: '2', partnerName: 'Charles', habit: 'Wake Up Early', checkedIn: true },
  { id: '3', partnerName: 'Becky', habit: 'Workout', checkedIn: true },
];

export default function DashboardScreen() {
  const router = useRouter();
  const [checkedGoals, setCheckedGoals] = useState<string[]>([]);

  const toggleGoalCheck = (goalId: string) => {
    setCheckedGoals(prev =>
      prev.includes(goalId)
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };

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

          <Text style={styles.greeting}>Hello, {userName}!</Text>

          <TouchableOpacity style={styles.notificationIcon}>
            <Ionicons name="notifications-outline" size={28} color="white" />
          </TouchableOpacity>
        </View>

        {/* Streaks Section */}
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

        {/* Check In Section */}
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
            {todaysGoals.map((goal) => (
              <TouchableOpacity
                key={goal.id}
                style={styles.goalCard}
                onPress={() => toggleGoalCheck(goal.id)}
              >
                <Text style={styles.goalCardTitle}>{goal.name}</Text>
                <Text style={styles.goalCardIcon}>{goal.icon}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Partner Progress Section */}
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
  scrollContent: {
    paddingBottom: 100, // Space for bottom nav
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
  },
  goalCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#291133',
  },
  goalCardIcon: {
    fontSize: 48,
    textAlign: 'center',
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
// testing testing