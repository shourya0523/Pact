import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';

interface HabitShadowCircleProps {
  label: string;
  onPress?: () => void;
}

const HabitShadowCircle: React.FC<HabitShadowCircleProps> = ({ 
  label,
  onPress 
}) => {
  const content = (
    <View style={styles.container}>
      <View style={styles.outerGlow} />
      <View style={styles.circle}>
        {/* Icon placeholder - you can add image here */}
      </View>
      
      <Text style={styles.label}>
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable 
        onPress={() => {
          console.log('HabitShadowCircle pressed:', label);
          onPress();
        }}
        style={({ pressed }) => [
          styles.pressable,
          pressed && styles.pressed
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  pressable: {
    zIndex: 999,
  },
  pressed: {
    opacity: 0.7,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 180,
    height: 200,
  },
  outerGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 8,
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'rgba(41, 17, 51, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    color: 'white',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
    fontFamily: 'WixMadeforText-Regular',
  },
});

export default HabitShadowCircle;
