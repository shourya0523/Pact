import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Simple streak indicator - just fire emoji + number
interface StreakIndicatorProps {
  currentStreak: number;
  isActive: boolean;
}

export default function StreakIndicator({ currentStreak, isActive }: StreakIndicatorProps) {
  return (
    <View style={[
      styles.container,
      isActive ? styles.active : styles.inactive
    ]}>
      {/* Fire emoji (only show if active) */}
      {isActive && <Text style={styles.emoji}>🔥</Text>}
      
      {/* Streak number */}
      <Text style={styles.number}>{currentStreak}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  active: {
    backgroundColor: 'rgba(168, 85, 247, 0.6)', // Purple
    borderColor: 'rgba(196, 181, 253, 0.4)',
  },
  inactive: {
    backgroundColor: 'rgba(75, 85, 99, 0.4)', // Gray
    borderColor: 'rgba(107, 114, 128, 0.4)',
  },
  emoji: {
    fontSize: 16,
    marginRight: 4,
  },
  number: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});