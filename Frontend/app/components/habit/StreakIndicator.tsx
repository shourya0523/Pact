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
  flameSize = 18,
  numberSize = 18,
  numberColor = 'white',
  spacing = 6,
  containerStyle = {},
}: StreakIndicatorProps) {
  return (
    <View
      style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, containerStyle]}
    >
      {isActive && (
        <Text style={{ fontSize: flameSize, marginRight: spacing }}>🔥</Text>
      )}
      <Text className="font-wix" style={{ fontSize: numberSize, color: numberColor, fontWeight: '600' }}>
        {currentStreak}
      </Text>
    </View>
  );
}
