// Screen to setup/create habits
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Predefined habit categories
const habitCategories = [
  { id: '1', name: 'Exercise', icon: '💪', color: '#FF6B6B' },
  { id: '2', name: 'Study', icon: '📚', color: '#4ECDC4' },
  { id: '3', name: 'Meditation', icon: '🧘', color: '#95E1D3' },
  { id: '4', name: 'Reading', icon: '📖', color: '#F38181' },
  { id: '5', name: 'Water', icon: '💧', color: '#3498db' },
  { id: '6', name: 'Sleep', icon: '😴', color: '#9B59B6' },
  { id: '7', name: 'Healthy Eating', icon: '🥗', color: '#2ECC71' },
  { id: '8', name: 'Journaling', icon: '✍️', color: '#E67E22' },
];

export default function HabitSetupScreen(): React.JSX.Element {
  const router = useRouter();
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);

  const toggleHabit = (habitId: string) => {
    setSelectedHabits(prev =>
      prev.includes(habitId)
        ? prev.filter(id => id !== habitId)
        : [...prev, habitId]
    );
  };

  const handleContinue = () => {
    try {
      if (selectedHabits.length === 0) {
        // Allow skipping for now
        console.log('Navigating to dashboard - no habits selected');
      } else {
        // TODO: Save selected habits to backend
        console.log('Selected habits:', selectedHabits);
        console.log('Navigating to dashboard with habits');
      }
      // Navigate to dashboard
      router.push('../main/DashboardScreen');
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to absolute path
      router.push('/screens/main/DashboardScreen');
    }
  };

  const handleSkip = () => {
    try {
      console.log('Skipping habit setup');
      router.push('../main/DashboardScreen');
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to absolute path
      router.push('/screens/main/DashboardScreen');
    }
  };

  return (
    <View style={styles.container}>
      {/* Stars background */}
      <View style={styles.starsContainer}>
        {[...Array(50)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.star,
              {
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: Math.random() * 3 + 1,
                height: Math.random() * 3 + 1,
                opacity: Math.random() * 0.7 + 0.3,
              }
            ]}
          />
        ))}
      </View>

      {/* Moon image */}
      <Image
        source={require('../../images/space/moon.png')}
        style={styles.moon}
        resizeMode="contain"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your{'\n'}Habits</Text>
          <Text style={styles.subtitle}>
            Select the habits you want to track with your partner
          </Text>
        </View>

        {/* Habit Grid */}
        <View style={styles.habitsGrid}>
          {habitCategories.map((habit) => {
            const isSelected = selectedHabits.includes(habit.id);
            return (
              <TouchableOpacity
                key={habit.id}
                style={[
                  styles.habitCard,
                  isSelected && styles.habitCardSelected,
                  { borderColor: habit.color }
                ]}
                onPress={() => toggleHabit(habit.id)}
                activeOpacity={0.7}
              >
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={24} color={habit.color} />
                  </View>
                )}
                <Text style={styles.habitIcon}>{habit.icon}</Text>
                <Text style={styles.habitName}>{habit.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Count */}
        <View style={styles.selectedCount}>
          <Text style={styles.selectedCountText}>
            {selectedHabits.length} habit{selectedHabits.length !== 1 ? 's' : ''} selected
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>
              {selectedHabits.length > 0 ? 'CONTINUE' : 'SKIP FOR NOW'}
            </Text>
          </TouchableOpacity>

          {selectedHabits.length > 0 && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.8}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#291133',
  },
  starsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  star: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 999,
  },
  moon: {
    position: 'absolute',
    width: 200,
    height: 200,
    top: -50,
    right: -30,
    opacity: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    lineHeight: 48,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 24,
  },
  habitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  habitCard: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 16,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  habitCardSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  habitIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  selectedCount: {
    alignItems: 'center',
    marginBottom: 24,
  },
  selectedCountText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  buttonsContainer: {
    gap: 12,
  },
  continueButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#291133',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
});
