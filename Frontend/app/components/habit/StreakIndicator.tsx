import React from 'react';
import { View, Text, TextStyle } from 'react-native';

interface StreakIndicatorProps {
  currentStreak: number;
  isActive: boolean;
  // optional customization
  flameSize?: number;
  numberSize?: number;
  numberColor?: string;
  spacing?: number;
  containerStyle?: TextStyle;
}

export default function StreakIndicator({
  currentStreak,
  isActive,
  flameSize = 16,
  numberSize = 16,
  numberColor = 'white',
  spacing = 4,
  containerStyle = {},
}: StreakIndicatorProps) {
  return (
    <View
      style={[{ flexDirection: 'row', alignItems: 'center' }, containerStyle]}
    >
      {isActive && (
        <Text style={{ fontSize: flameSize, marginRight: spacing }}>🔥</Text>
      )}
      <Text style={{ fontSize: numberSize, color: numberColor, fontWeight: 'bold' }}>
        {currentStreak}
      </Text>
    </View>
  );
}
